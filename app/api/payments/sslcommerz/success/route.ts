import { NextResponse } from "next/server";

// SSLCommerz redirects the user's browser here after payment (via an
// auto-submitted form POST). This is UX only — actual activation happens in
// the IPN route, which may land a moment before or after this request.
function redirectToDashboard(origin: string) {
  return NextResponse.redirect(new URL("/dashboard?payment=processing", origin));
}

export async function POST(request: Request) {
  return redirectToDashboard(new URL(request.url).origin);
}

export async function GET(request: Request) {
  return redirectToDashboard(new URL(request.url).origin);
}
