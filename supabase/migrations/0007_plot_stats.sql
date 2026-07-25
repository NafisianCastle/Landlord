-- Dashboard aggregate views. security_invoker=true makes these run as the
-- querying user (not the view owner), so land_plots' existing RLS policies
-- already scope every aggregate to that user's own rows — no extra
-- user_id filter needed here.

create view plot_stats
with (security_invoker = true)
as
select
  count(*) as plot_count,
  coalesce(sum(area_sq_meters), 0) as total_area_sq_meters,
  coalesce(sum(purchase_price), 0) as total_purchase_price,
  coalesce(sum(current_estimated_value), 0) as total_current_value
from land_plots;

create view plot_stats_by_district
with (security_invoker = true)
as
select
  coalesce(district, 'Unspecified') as district,
  count(*) as plot_count,
  coalesce(sum(area_sq_meters), 0) as total_area_sq_meters
from land_plots
group by coalesce(district, 'Unspecified')
order by total_area_sq_meters desc;
