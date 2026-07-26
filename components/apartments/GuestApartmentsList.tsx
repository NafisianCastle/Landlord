"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { listGuestApartments, type GuestApartment } from "@/lib/offline/guestApartments";
import { Button } from "@/components/ui/button";
import ApartmentsListClient from "@/components/apartments/ApartmentsListClient";
import PageContainer from "@/components/system/PageContainer";
import PageHeader from "@/components/system/PageHeader";

export default function GuestApartmentsList() {
  const t = useTranslations("ApartmentsPage");
  const [apartments, setApartments] = useState<GuestApartment[] | null>(null);

  useEffect(() => {
    listGuestApartments().then(setApartments);
  }, []);

  if (apartments === null) return null;

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

      <ApartmentsListClient
        apartments={apartments.map((a) => ({
          id: a.id,
          name: a.name,
          district: a.district,
          upazila: a.upazila,
          size: a.size,
          sizeUnit: a.sizeUnit,
        }))}
      />
    </PageContainer>
  );
}
