import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { createVendor } from "@/app/actions/vendors";
import PageContainer from "@/components/system/PageContainer";
import PageHeader from "@/components/system/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import VendorForm from "@/components/vendors/VendorForm";
import VendorsList, { type VendorRow } from "@/components/vendors/VendorsList";

export default async function VendorsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const t = await getTranslations("VendorsPage");

  if (!user) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
        <p className="text-sm text-muted-foreground">{t("signInRequired")}</p>
      </div>
    );
  }

  const { data: vendors } = await supabase
    .from("vendors")
    .select("id, name, trade, phone, notes")
    .order("name", { ascending: true });

  const rows: VendorRow[] = vendors ?? [];

  return (
    <PageContainer>
      <PageHeader title={t("title")} />
      <VendorsList vendors={rows} />
      <Card>
        <CardContent className="pt-6">
          <VendorForm action={createVendor} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
