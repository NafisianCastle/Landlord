import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteAccount, exportAccountData } from "@/lib/account";

// Data export (GET) and account deletion (DELETE) for the mobile app, which
// authenticates with its Supabase access token as a bearer token. The web
// app uses the server actions in app/actions/account.ts instead.

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function userFromBearer(request: Request) {
  const match = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "");
  if (!match) return null;
  const {
    data: { user },
  } = await createAdminClient().auth.getUser(match[1]);
  return user;
}

export async function GET(request: Request) {
  const user = await userFromBearer(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  return json(await exportAccountData(user));
}

export async function DELETE(request: Request) {
  const user = await userFromBearer(request);
  if (!user) return json({ error: "Unauthorized" }, 401);
  const body: unknown = await request.json().catch(() => null);
  const field = (key: string) => {
    const value = body && typeof body === "object" ? (body as Record<string, unknown>)[key] : undefined;
    return typeof value === "string" ? value.slice(0, 1024) : "";
  };
  const result = await deleteAccount(user, field("confirmation"), field("password"));
  return json(result, result.error ? 400 : 200);
}
