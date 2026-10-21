import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Auth for /api/admin/*, used by the mobile app. The app sends its Supabase
// access token as a bearer token (it has no web session cookie, and the
// service-role key must never ship in an app). Same gate as requireAdmin:
// a valid user whose profile has is_admin.
export async function adminFromBearer(
  request: Request,
): Promise<{ id: string } | NextResponse> {
  const match = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "");
  if (!match) return adminJson({ error: "Unauthorized" }, 401);

  const admin = createAdminClient();
  const {
    data: { user },
  } = await admin.auth.getUser(match[1]);
  if (!user) return adminJson({ error: "Unauthorized" }, 401);

  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return adminJson({ error: "Forbidden" }, 403);
  return { id: user.id };
}

export function adminJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

/** Turns a JSON body into FormData so the API shares the actions' validation. */
export async function jsonForm(request: Request, fields: string[]): Promise<FormData | null> {
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const form = new FormData();
  for (const field of fields) {
    const value = (body as Record<string, unknown>)[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string" && typeof value !== "number") return null;
    form.set(field, String(value));
  }
  return form;
}

/** Same result shape as the server actions, with a matching status code. */
export function adminResult(result: { error?: string; success?: true }) {
  return adminJson(result, result.error ? 400 : 200);
}
