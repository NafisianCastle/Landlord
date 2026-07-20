-- Raw walked GPS points, synced from the client's offline queue (Dexie).
-- Kept separate from land_plots.boundary as a durability/audit trail — the
-- final polygon is written independently via upsert_plot_boundary once all
-- points for a walk session are captured. unique(session_id, seq) makes
-- syncing safely retryable (client-generated session_id, per-tap sequence).

create table plot_boundary_points (
  id uuid primary key default gen_random_uuid(),
  plot_id uuid not null references land_plots(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  seq int not null,
  lat double precision not null,
  lng double precision not null,
  accuracy_meters numeric,
  captured_at timestamptz not null default now(),
  unique (session_id, seq)
);

alter table plot_boundary_points enable row level security;

create policy "plot_boundary_points_select_own" on plot_boundary_points for select using (auth.uid() = user_id);
create policy "plot_boundary_points_insert_own" on plot_boundary_points for insert with check (auth.uid() = user_id);
create policy "plot_boundary_points_delete_own" on plot_boundary_points for delete using (auth.uid() = user_id);

create index plot_boundary_points_session_idx on plot_boundary_points (session_id);
create index plot_boundary_points_plot_idx on plot_boundary_points (plot_id);
