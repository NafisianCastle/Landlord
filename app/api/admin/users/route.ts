import { adminFromBearer, adminJson, adminResult } from "@/lib/adminApi";
import { getAdminUsers } from "@/lib/adminData";
import { grantLifetimeAccessOp } from "@/lib/adminOps";

export async function GET(request: Request) {
  const admin = await adminFromBearer(request);
  if (admin instanceof Response) return admin;
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 254) || undefined;
  return adminJson({ users: await getAdminUsers(q) });
}

/** Grant lifetime access: { userId } */
export async function POST(request: Request) {
  const admin = await adminFromBearer(request);
  if (admin instanceof Response) return admin;
  const body = await request.json().catch(() => null);
  return adminResult(await grantLifetimeAccessOp(body?.userId));
}
