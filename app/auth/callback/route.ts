import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const referralCode = request.cookies.get("landly_ref")?.value;
      if (referralCode) {
        const { error: refError } = await supabase.rpc("attribute_referral", {
          p_referral_code: referralCode,
        });
        if (refError) console.error("attribute_referral failed:", refError.message);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }

    const reason =
      error.code === "identity_already_exists" || error.message.toLowerCase().includes("already registered")
        ? "account_exists"
        : "oauth";
    return NextResponse.redirect(`${origin}/login?error=${reason}`);
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
