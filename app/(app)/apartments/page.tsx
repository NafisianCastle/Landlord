import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import GuestApartmentsList from "@/components/apartments/GuestApartmentsList";
import ApartmentsListClient from "@/components/apartments/ApartmentsListClient";

export default async function ApartmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <GuestApartmentsList />;
  }

  const { data: apartments, error } = await supabase
    .from("apartments")
    .select("id, name, district, upazila, size, size_unit, user_id")
    .order("created_at", { ascending: false });

  const mapped = (apartments ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    district: a.district,
    upazila: a.upazila,
    size: a.size,
    sizeUnit: a.size_unit,
    shared: a.user_id !== user.id,
  }));

  const t = await getTranslations("ApartmentsPage");

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/apartments/new">{t("addApartment")}</Link>
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {t("loadError", { message: error.message })}
        </p>
      ) : (
        <ApartmentsListClient apartments={mapped} />
      )}
    </div>
  );
}
