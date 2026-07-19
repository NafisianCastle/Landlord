import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Welcome, {user?.email}</h1>
      <p className="text-neutral-600">
        Plot list, map, and dashboard analytics land in Phase 1 and Phase 4.
      </p>
    </div>
  );
}
