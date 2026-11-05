import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cronAuthorized } from "@/lib/cronAuth";
import { demoEnabled } from "@/lib/demo";
import { seedDemoAccount } from "@/lib/demoSeed.mjs";

// Nightly: restores the shared read-only demo's sample data and signs out its
// visitor sessions (vercel.json). The demo is read-only, so this mainly undoes
// rent marked paid/unpaid and keeps sessions from piling up.
export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!demoEnabled()) {
    return NextResponse.json({ skipped: true });
  }
  try {
    await seedDemoAccount(createAdminClient(), {
      email: process.env.DEMO_USER_EMAIL!,
      password: process.env.DEMO_USER_PASSWORD!,
      log: (message) => console.log(`demo-reset: ${message}`),
    });
    return NextResponse.json({ reset: true });
  } catch (error) {
    console.error("demo-reset failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
