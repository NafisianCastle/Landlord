// Canonical area-conversion constants. Kept in sync with the Postgres
// mirror `fn_area_conversions` (supabase/migrations/0003_area_conversions.sql).
// Decimal (shotangsho) is the standardized base for Bangladeshi units since
// it's the one unit with a consistent nationwide definition; bigha/katha are
// derived from it. Kani/gonda are Sylhet/Chittagong Hill Tracts regional
// units with no national legal standard — treat as an approximation.

export const SQ_METERS_PER_DECIMAL = 40.4686;

const DECIMAL_PER_BIGHA = 33;
const DECIMAL_PER_KATHA = DECIMAL_PER_BIGHA / 20; // 1 bigha = 20 katha
const DECIMAL_PER_KANI = 40; // regional approximation (Sylhet convention)
const DECIMAL_PER_GONDA = DECIMAL_PER_KANI / 20; // 1 kani = 20 gonda (regional)

const SQ_METERS_PER_ACRE = 4046.8564224;
const SQ_METERS_PER_SQFT = 0.09290304;
const SQ_METERS_PER_SQMILE = 2589988.110336;
const SQ_METERS_PER_SQKM = 1_000_000;

export interface AreaConversions {
  sqMeters: number;
  decimal: number;
  bigha: number;
  katha: number;
  /** Regional estimate (Sylhet/CHT), not a national standard. */
  kani: number;
  /** Regional estimate (Sylhet/CHT), not a national standard. */
  gonda: number;
  acre: number;
  sqFt: number;
  sqMile: number;
  sqKm: number;
}

export function convertArea(sqMeters: number): AreaConversions {
  const decimal = sqMeters / SQ_METERS_PER_DECIMAL;

  return {
    sqMeters,
    decimal,
    bigha: decimal / DECIMAL_PER_BIGHA,
    katha: decimal / DECIMAL_PER_KATHA,
    kani: decimal / DECIMAL_PER_KANI,
    gonda: decimal / DECIMAL_PER_GONDA,
    acre: sqMeters / SQ_METERS_PER_ACRE,
    sqFt: sqMeters / SQ_METERS_PER_SQFT,
    sqMile: sqMeters / SQ_METERS_PER_SQMILE,
    sqKm: sqMeters / SQ_METERS_PER_SQKM,
  };
}
