-- Fix "new row violates row-level security policy" on creating a plot/apartment.
--
-- insert(...).select() makes PostgREST add RETURNING, which re-checks the new
-- row against the SELECT policy. Since 0015/0019 that policy was only
-- is_plot_collaborator(id) / is_apartment_collaborator(id): STABLE functions
-- query with the calling statement's snapshot, so their inner
-- `select ... from land_plots where id = ...` can't see the row the same
-- statement just inserted, returns false, and the insert is rejected.
-- Checking user_id directly needs no lookup, so owners always pass; the
-- function still covers collaborators on already-existing rows.

drop policy if exists "land_plots_select_own" on land_plots;
create policy "land_plots_select_own" on land_plots for select
  using (auth.uid() = user_id or is_plot_collaborator(id));

drop policy if exists "apartments_select_own" on apartments;
create policy "apartments_select_own" on apartments for select
  using (auth.uid() = user_id or is_apartment_collaborator(id));
