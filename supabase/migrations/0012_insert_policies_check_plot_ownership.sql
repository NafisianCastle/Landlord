-- plot_documents_insert_own and plot_boundary_points_insert_own only checked
-- auth.uid() = user_id, not that plot_id actually belongs to that user — a
-- signed-in user could insert rows pointing at another user's plot_id (the
-- FK only requires the plot to exist). Tighten both to also verify
-- ownership of the referenced plot.

drop policy "plot_documents_insert_own" on plot_documents;
create policy "plot_documents_insert_own" on plot_documents for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from land_plots p where p.id = plot_id and p.user_id = auth.uid()
    )
  );

drop policy "plot_boundary_points_insert_own" on plot_boundary_points;
create policy "plot_boundary_points_insert_own" on plot_boundary_points for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from land_plots p where p.id = plot_id and p.user_id = auth.uid()
    )
  );
