import { getTranslations } from "next-intl/server";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export default async function RefundPage() {
  const t = await getTranslations("RefundPage");
  return (
    <LegalPageLayout
      title={t("title")}
      lastUpdated={t("lastUpdated")}
      draftNotice={t("draftNotice")}
      body={t("body")}
    />
  );
}
