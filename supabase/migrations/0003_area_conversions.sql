-- Server-side mirror of lib/units.ts convertArea(), for dashboard RPCs that
-- aggregate area server-side (sums across many rows) and need conversions
-- without round-tripping the raw sqm total to the client first.
-- Keep constants in sync with lib/units.ts if either changes.

create function fn_area_conversions(sqm numeric)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'sqMeters', sqm,
    'decimal', sqm / 40.4686,
    'bigha', (sqm / 40.4686) / 33,
    'katha', (sqm / 40.4686) / (33.0 / 20),
    'kani', (sqm / 40.4686) / 40,
    'gonda', (sqm / 40.4686) / (40.0 / 20),
    'acre', sqm / 4046.8564224,
    'sqFt', sqm / 0.09290304,
    'sqMile', sqm / 2589988.110336,
    'sqKm', sqm / 1000000
  );
$$;
