-- Phase 1: land plots + geodesic area trigger

create table land_plots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  village text,
  upazila text,
  district text,
  division text,
  mutation_number text,
  purchase_price numeric,
  purchase_date date,
  current_estimated_value numeric,
  notes text,
  boundary geography(Polygon, 4326),
  area_sq_meters numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table land_plots enable row level security;

create policy "land_plots_select_own" on land_plots for select using (auth.uid() = user_id);
create policy "land_plots_insert_own" on land_plots for insert with check (auth.uid() = user_id);
create policy "land_plots_update_own" on land_plots for update using (auth.uid() = user_id);
create policy "land_plots_delete_own" on land_plots for delete using (auth.uid() = user_id);

create function set_plot_area_and_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.area_sq_meters := case
    when new.boundary is not null then ST_Area(new.boundary)
    else null
  end;
  new.updated_at := now();
  return new;
end;
$$;

create trigger on_land_plot_write
  before insert or update on land_plots
  for each row execute function set_plot_area_and_timestamp();

create index land_plots_user_id_idx on land_plots (user_id);
create index land_plots_boundary_idx on land_plots using gist (boundary);

-- Idempotent full-replace boundary upsert, called after a boundary walk finishes.
-- geojson is a GeoJSON Polygon (client builds it from the walked points).
create function upsert_plot_boundary(p_plot_id uuid, p_geojson jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  update land_plots
  set boundary = ST_SetSRID(ST_GeomFromGeoJSON(p_geojson::text), 4326)::geography
  where id = p_plot_id and user_id = auth.uid();
end;
$$;
