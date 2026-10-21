import { adminFromBearer, adminJson, adminResult, jsonForm } from "@/lib/adminApi";
import { getAdminCoupons } from "@/lib/adminData";
import { createCouponOp, toggleCouponOp } from "@/lib/adminOps";

export async function GET(request: Request) {
  const admin = await adminFromBearer(request);
  if (admin instanceof Response) return admin;
  return adminJson({ coupons: await getAdminCoupons() });
}

/** Create: { code, discountType, discountValue, maxRedemptions?, expiresAt? } */
export async function POST(request: Request) {
  const admin = await adminFromBearer(request);
  if (admin instanceof Response) return admin;
  const form = await jsonForm(request, ["code", "discountType", "discountValue", "maxRedemptions", "expiresAt"]);
  if (!form) return adminJson({ error: "Invalid request." }, 400);
  return adminResult(await createCouponOp(admin.id, form));
}

/** Activate/deactivate: { id, active } */
export async function PATCH(request: Request) {
  const admin = await adminFromBearer(request);
  if (admin instanceof Response) return admin;
  const body = await request.json().catch(() => null);
  return adminResult(await toggleCouponOp(body?.id, body?.active));
}
