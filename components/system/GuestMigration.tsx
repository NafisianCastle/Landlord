"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { listGuestPlots, clearGuestPlots } from "@/lib/offline/guestPlots";
import { migrateGuestPlots } from "@/app/actions/plots";
import { listGuestApartments, clearGuestApartments } from "@/lib/offline/guestApartments";
import { migrateGuestApartments } from "@/app/actions/apartments";

/**
 * Mounted only when a Supabase session exists (see app/(app)/layout.tsx).
 * Runs once per mount: if guest mode left plots in local Dexie storage, pushes
 * them into the account and clears the local copies. Fires the same whether
 * this is a fresh signup or a login to an existing account.
 */
export default function GuestMigration() {
  const router = useRouter();
  const t = useTranslations("GuestMode");
  const [migratedCount, setMigratedCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [guestPlots, guestApartments] = await Promise.all([
        listGuestPlots(),
        listGuestApartments(),
      ]);
      if (guestPlots.length === 0 && guestApartments.length === 0) return;

      const [plotResult, apartmentResult] = await Promise.all([
        guestPlots.length
          ? migrateGuestPlots(
              guestPlots.map((p) => ({
                name: p.name,
                upazila: p.upazila,
                district: p.district,
                division: p.division,
                dolilArea: p.dolilArea,
                dolilAreaUnit: p.dolilAreaUnit,
                actualArea: p.actualArea,
                actualAreaUnit: p.actualAreaUnit,
                village: p.village,
                mutationNumber: p.mutationNumber,
                purchasePrice: p.purchasePrice,
                purchaseDate: p.purchaseDate,
                currentEstimatedValue: p.currentEstimatedValue,
                notes: p.notes,
                boundaryGeojson: p.boundaryGeojson,
              })),
            )
          : { migrated: 0 },
        guestApartments.length
          ? migrateGuestApartments(
              guestApartments.map((a) => ({
                name: a.name,
                upazila: a.upazila,
                district: a.district,
                division: a.division,
                floor: a.floor,
                size: a.size,
                sizeUnit: a.sizeUnit,
                buildingName: a.buildingName,
                unitNumber: a.unitNumber,
                purchasePrice: a.purchasePrice,
                purchaseDate: a.purchaseDate,
                currentEstimatedValue: a.currentEstimatedValue,
                notes: a.notes,
                latitude: a.latitude ?? null,
                longitude: a.longitude ?? null,
              })),
            )
          : { migrated: 0 },
      ]);

      if (cancelled) return;
      const totalMigrated = plotResult.migrated + apartmentResult.migrated;
      if (!totalMigrated) return;
      await Promise.all([
        plotResult.migrated ? clearGuestPlots(guestPlots.map((p) => p.id)) : Promise.resolve(),
        apartmentResult.migrated
          ? clearGuestApartments(guestApartments.map((a) => a.id))
          : Promise.resolve(),
      ]);
      setMigratedCount(totalMigrated);
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (migratedCount === null) return null;

  return (
    <p
      role="status"
      className="border-b border-border bg-success/10 px-4 py-2 text-center text-sm text-success md:px-6"
    >
      {t("migratedNotice", { count: migratedCount })}
    </p>
  );
}
