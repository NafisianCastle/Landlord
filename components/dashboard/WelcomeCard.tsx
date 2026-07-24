import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WelcomeCard() {
  const t = useTranslations("WelcomeCard");

  return (
    <Card>
      <CardContent className="flex flex-col items-start gap-3 pt-6">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        <Button asChild>
          <Link href="/plots/new">{t("addPlot")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
