import { adminFromBearer, adminJson, adminResult, jsonForm } from "@/lib/adminApi";
import { getAppSettings } from "@/lib/settings";
import { updateAppSettingsOp } from "@/lib/adminOps";

export async function GET(request: Request) {
  const admin = await adminFromBearer(request);
  if (admin instanceof Response) return admin;
  return adminJson(await getAppSettings());
}

/** Update: { lifetimePriceBdt, trialDays } */
export async function PUT(request: Request) {
  const admin = await adminFromBearer(request);
  if (admin instanceof Response) return admin;
  const form = await jsonForm(request, ["lifetimePriceBdt", "trialDays"]);
  if (!form) return adminJson({ error: "Invalid request." }, 400);
  return adminResult(await updateAppSettingsOp(form));
}
