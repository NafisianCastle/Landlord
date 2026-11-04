import { createAdminClient } from "@/lib/supabase/admin";
import { createTenantPortalLinkForOwner, revokeTenantPortalLinksForOwner } from "@/lib/tenantPortal";

async function bearerUser(request: Request) {
  const match = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "");
  if (!match) return null;
  const { data: { user } } = await createAdminClient().auth.getUser(match[1]);
  return user;
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const user = await bearerUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.tenantShareId !== "string") return json({ error: "Invalid request." }, 400);
  const result = await createTenantPortalLinkForOwner(user.id, body.tenantShareId);
  return json(result, result.error ? 400 : 200);
}

export async function DELETE(request: Request) {
  const user = await bearerUser(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.tenantShareId !== "string") return json({ error: "Invalid request." }, 400);
  const result = await revokeTenantPortalLinksForOwner(user.id, body.tenantShareId);
  return json(result, result.error ? 400 : 200);
}
