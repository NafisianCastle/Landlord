import Link from "next/link";
import type { Polygon } from "geojson";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import PlotsMapClient from "./PlotsMapClient";
import GuestPlotsList from "@/components/plots/GuestPlotsList";
import PlotsListClient from "@/components/plots/PlotsListClient";

export default async function PlotsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <GuestPlotsList />;
  }

  const { data: plots, error } = await supabase
    .from("land_plots")
    .select("id, name, village, district, area_sq_meters, boundary_geojson, user_id")
    .order("created_at", { ascending: false });

  const mapped = (plots ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    village: p.village,
    district: p.district,
    areaSqMeters: p.area_sq_meters,
    boundary: p.boundary_geojson as Polygon | null,
    shared: p.user_id !== user.id,
  }));

  const t = await getTranslations("PlotsPage");

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <Button asChild>
          <Link href="/plots/new">{t("addPlot")}</Link>
        </Button>
      </div>

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {t("loadError", { message: error.message })}
        </p>
      ) : (
        <>
          <PlotsMapClient
            plots={mapped.filter(
              (p): p is typeof p & { boundary: Polygon } => p.boundary !== null,
            )}
          />

          <PlotsListClient plots={mapped} />
        </>
      )}
    </div>
  );
}
