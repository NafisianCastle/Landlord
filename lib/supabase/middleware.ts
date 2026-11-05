import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/payments is exempt because SSLCommerz's IPN webhook calls it
// server-to-server with no browser session at all.
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth/callback",
  "/api/payments",
  "/api/tenant-portal",
  "/tenant/bills",
  "/terms",
  "/privacy",
  "/refund",
];

// Guest mode: dashboard and plots work unauthenticated, backed by local
// (Dexie) storage, so visitors can try the core feature before signing up.
// Everything else (e.g. /profile) still requires a session.
const GUEST_ALLOWED_PATHS = ["/", "/dashboard", "/plots"];

export async function updateSession(request: NextRequest) {
  // Cron handlers authenticate their own bearer secret, and /api/admin,
  // /api/tenant-links and /api/account the mobile app's Supabase access
  // token, without cookies.
  if (
    ["/api/cron/rent-reminders", "/api/cron/lease-expiry", "/api/cron/bill-reminders", "/api/cron/demo-reset"].includes(
      request.nextUrl.pathname,
    ) ||
    request.nextUrl.pathname.startsWith("/api/admin/") ||
    request.nextUrl.pathname === "/api/tenant-links" ||
    request.nextUrl.pathname === "/api/account"
  ) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = [...PUBLIC_PATHS, ...GUEST_ALLOWED_PATHS].some(
    (path) =>
      request.nextUrl.pathname === path ||
      request.nextUrl.pathname.startsWith(`${path}/`),
  );

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
