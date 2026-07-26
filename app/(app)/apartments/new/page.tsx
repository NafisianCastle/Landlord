import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createApartment } from "@/app/actions/apartments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ApartmentMetadataForm from "@/components/apartments/ApartmentMetadataForm";
import GuestApartmentForm from "@/components/apartments/GuestApartmentForm";

export default async function NewApartmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("NewApartmentPage");

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("apartmentDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <ApartmentMetadataForm action={createApartment} submitLabel={t("createApartment")} />
          ) : (
            <GuestApartmentForm submitLabel={t("createApartment")} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
