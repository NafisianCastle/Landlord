import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import GuestApartmentsList from "@/components/apartments/GuestApartmentsList";
import ApartmentsListClient from "@/components/apartments/ApartmentsListClient";
import PageContainer from "@/components/system/PageContainer";
import PageHeader from "@/components/system/PageHeader";

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
    <PageContainer>
      <PageHeader
        title={t("title")}
        action={
          <Button asChild>
            <Link href="/apartments/new">{t("addApartment")}</Link>
          </Button>
        }
      />

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {t("loadError", { message: error.message })}
        </p>
      ) : (
        <ApartmentsListClient apartments={mapped} />
      )}
    </PageContainer>
  );
}
