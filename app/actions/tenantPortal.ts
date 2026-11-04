"use server";

import { getUserWithAccess } from "@/lib/access";
import { createTenantPortalLinkForOwner, revokeTenantPortalLinksForOwner } from "@/lib/tenantPortal";

export async function createTenantPortalLink(tenantShareId: string) {
  const auth = await getUserWithAccess();
  if (!auth?.hasAccess) return { error: "Access required." };
  return createTenantPortalLinkForOwner(auth.user.id, tenantShareId);
}

export async function revokeTenantPortalLink(tenantShareId: string) {
  const auth = await getUserWithAccess();
  if (!auth?.hasAccess) return { error: "Access required." };
  return revokeTenantPortalLinksForOwner(auth.user.id, tenantShareId);
}
