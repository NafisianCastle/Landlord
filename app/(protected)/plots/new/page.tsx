import { getTranslations } from "next-intl/server";
import { createPlot } from "@/app/actions/plots";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlotMetadataForm from "@/components/plots/PlotMetadataForm";

export default async function NewPlotPage() {
  const t = await getTranslations("NewPlotPage");

  return (
    <div className="mx-auto max-w-lg p-6">
      <h1 className="mb-4 text-xl font-semibold">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("plotDetails")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PlotMetadataForm action={createPlot} submitLabel={t("createPlot")} />
        </CardContent>
      </Card>
    </div>
  );
}
