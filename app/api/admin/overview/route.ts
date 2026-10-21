import { adminFromBearer, adminJson } from "@/lib/adminApi";
import { getAdminOverview } from "@/lib/adminData";

export async function GET(request: Request) {
  const admin = await adminFromBearer(request);
  if (admin instanceof Response) return admin;
  return adminJson(await getAdminOverview());
}
