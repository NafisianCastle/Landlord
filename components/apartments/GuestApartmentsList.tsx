"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { listGuestApartments, type GuestApartment } from "@/lib/offline/guestApartments";
import { Button } from "@/components/ui/button";
import ApartmentsListClient from "@/components/apartments/ApartmentsListClient";

export default function GuestApartmentsList() {
  const t = useTranslations("ApartmentsPage");
  const [apartments, setApartments] = useState<GuestApartment[] | null>(null);

  useEffect(() => {
    listGuestApartments().then(setApartments);
  }, []);

  if (apartments === null) return null;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/apartments/new">{t("addApartment")}</Link>
        </Button>
      </div>

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
    </div>
  );
}
