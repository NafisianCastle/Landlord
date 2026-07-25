-- PostgREST returns `geography` columns as EWKB hex strings, not GeoJSON, so
-- the app can't read land_plots.boundary directly. Mirror it into a plain
-- jsonb column via the same trigger that already maintains area_sq_meters.

alter table land_plots add column boundary_geojson jsonb;

create or replace function set_plot_area_and_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.area_sq_meters := case
    when new.boundary is not null then ST_Area(new.boundary)
    else null
  end;
  new.boundary_geojson := case
    when new.boundary is not null then ST_AsGeoJSON(new.boundary)::jsonb
    else null
  end;
  new.updated_at := now();
  return new;
end;
$$;

-- Backfill existing rows (trigger only applies to future writes).
update land_plots
set boundary_geojson = ST_AsGeoJSON(boundary)::jsonb
where boundary is not null;
