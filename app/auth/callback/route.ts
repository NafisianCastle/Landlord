import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log("[auth/callback] exchange result", {
      error: error?.message,
      user: data?.user?.id,
      session: !!data?.session,
    });
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      console.log(
        "[auth/callback] outgoing Set-Cookie names",
        response.cookies.getAll().map((c) => c.name),
      );
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
