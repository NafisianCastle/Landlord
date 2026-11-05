import { getTranslations } from "next-intl/server";
import { getAppSettings } from "@/lib/settings";
import { Card, CardContent } from "@/components/ui/card";
import AppSettingsForm from "@/components/admin/AppSettingsForm";

export default async function AdminSettingsPage() {
  const t = await getTranslations("AdminSettingsPage");
  const settings = await getAppSettings();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t("title")}</h1>
      <Card>
        <CardContent className="pt-6">
          <AppSettingsForm
            lifetimePriceBdt={settings.lifetimePriceBdt}
            trialDays={settings.trialDays}
          />
        </CardContent>
      </Card>
    </div>
  );
}
