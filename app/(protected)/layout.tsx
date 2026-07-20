import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

// Phase 0: auth-only gate. Trial/subscription check (lib/access.ts) is added
// in Phase 5 once the subscriptions table and paywall page exist.
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="font-semibold">Landly</span>
          <Link href="/dashboard" className="text-sm">
            Dashboard
          </Link>
          <Link href="/plots" className="text-sm">
            Plots
          </Link>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-sm underline">
            Log out
          </button>
        </form>
      </header>
      <main>{children}</main>
    </div>
  );
}
