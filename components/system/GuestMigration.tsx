"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { listGuestPlots, clearGuestPlots } from "@/lib/offline/guestPlots";
import { migrateGuestPlots } from "@/app/actions/plots";

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
      const guestPlots = await listGuestPlots();
      if (guestPlots.length === 0) return;

      const result = await migrateGuestPlots(
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
      );

      if (cancelled || !result.migrated) return;
      await clearGuestPlots(guestPlots.map((p) => p.id));
      setMigratedCount(result.migrated);
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
      className="border-b border-border bg-green-500/10 px-4 py-2 text-center text-sm text-green-700 dark:text-green-400 md:px-6"
    >
      {t("migratedNotice", { count: migratedCount })}
    </p>
  );
}
