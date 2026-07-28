import Link from "next/link";
import { MapPinned, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WelcomeCard() {
  const t = useTranslations("WelcomeCard");

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center sm:items-start sm:py-6 sm:text-left">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPinned className="size-6" />
        </div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="max-w-xs text-sm text-muted-foreground sm:max-w-sm">{t("subtitle")}</p>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/plots/new">
            <Plus className="size-4" />
            {t("addPlot")}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
