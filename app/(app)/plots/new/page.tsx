import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { createPlot } from "@/app/actions/plots";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlotMetadataForm from "@/components/plots/PlotMetadataForm";
import GuestPlotForm from "@/components/plots/GuestPlotForm";

export default async function NewPlotPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const t = await getTranslations("NewPlotPage");

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("plotDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <PlotMetadataForm action={createPlot} submitLabel={t("createPlot")} />
          ) : (
            <GuestPlotForm submitLabel={t("createPlot")} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
