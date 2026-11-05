import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { UUID } from "@/lib/validation/forms";
import type { ApartmentBill } from "@/lib/bills";

const TOKEN = /^[0-9a-f]{64}$/;
const LINK_DAYS = 90;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createTenantPortalLinkForOwner(ownerId: string, tenantShareId: string) {
  if (!UUID.test(ownerId) || !UUID.test(tenantShareId)) return { error: "Invalid tenant." };
  const admin = createAdminClient();
  const { data: share, error: shareError } = await admin
    .from("apartment_tenants")
    .select("id")
    .eq("id", tenantShareId)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (shareError || !share) return { error: "Tenant not found." };

  const now = new Date();
  const expiresAt = new Date(now.getTime() + LINK_DAYS * 86_400_000).toISOString();
  const token = randomBytes(32).toString("hex");
  const { data: created, error } = await admin.from("tenant_portal_links").insert({
    tenant_share_id: tenantShareId,
    owner_id: ownerId,
    token_hash: hashToken(token),
    expires_at: expiresAt,
  }).select("id").single();
  if (error) return { error: "Could not create the tenant link." };
  const { error: revokeError } = await admin
    .from("tenant_portal_links")
    .update({ revoked_at: now.toISOString() })
    .eq("tenant_share_id", tenantShareId)
    .eq("owner_id", ownerId)
    .is("revoked_at", null)
    .neq("id", created.id);
  if (revokeError) return { error: "The new link was created, but the previous link could not be replaced." };
  return { success: true as const, url: `${SITE_URL}/tenant/bills/${token}`, expiresAt };
}

export async function revokeTenantPortalLinksForOwner(ownerId: string, tenantShareId: string) {
  if (!UUID.test(ownerId) || !UUID.test(tenantShareId)) return { error: "Invalid tenant." };
  const admin = createAdminClient();
  const { data: share } = await admin.from("apartment_tenants").select("id")
    .eq("id", tenantShareId).eq("owner_id", ownerId).maybeSingle();
  if (!share) return { error: "Tenant not found." };
  const { error } = await admin.from("tenant_portal_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("tenant_share_id", tenantShareId).eq("owner_id", ownerId).is("revoked_at", null);
  return error ? { error: "Could not revoke the tenant link." } : { success: true as const };
}

async function activeLink(token: string) {
  if (!TOKEN.test(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("tenant_portal_links")
    .select("tenant_share_id, expires_at")
    .eq("token_hash", hashToken(token))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return data;
}

export async function getTenantPortal(token: string) {
  const link = await activeLink(token);
  if (!link) return null;
  const admin = createAdminClient();
  const [{ data: tenant }, { data: bills, error }] = await Promise.all([
    admin.from("apartment_tenants")
      .select("id, apartment_id, invited_email, apartment_label")
      .eq("id", link.tenant_share_id).maybeSingle(),
    admin.from("apartment_bills")
      .select("id, apartment_id, owner_id, tenant_share_id, tenant_email, title, amount, due_date, visible_to_tenant, file_name, paid_at")
      .eq("tenant_share_id", link.tenant_share_id)
      .eq("visible_to_tenant", true)
      .not("storage_path", "is", null)
      .order("due_date", { ascending: false }),
  ]);
  if (!tenant || error) return null;
  return { tenant, bills: bills as ApartmentBill[], expiresAt: link.expires_at };
}

export async function getTenantPortalBillFile(token: string, billId: string) {
  if (!UUID.test(billId)) return null;
  const link = await activeLink(token);
  if (!link) return null;
  const admin = createAdminClient();
  const { data: bill } = await admin.from("apartment_bills")
    .select("storage_path, file_name")
    .eq("id", billId)
    .eq("tenant_share_id", link.tenant_share_id)
    .eq("visible_to_tenant", true)
    .not("storage_path", "is", null)
    .maybeSingle();
  if (!bill?.storage_path) return null;
  const { data, error } = await admin.storage.from("apartment-bills").download(bill.storage_path);
  if (!data || error) return null;
  return { data, fileName: bill.file_name ?? "bill" };
}
