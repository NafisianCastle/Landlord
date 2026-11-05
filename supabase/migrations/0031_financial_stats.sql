-- Income/expense/profit aggregates, mirrors 0023_lease_stats.sql's pattern.
-- security_invoker means each underlying table's own RLS already scopes
-- these views to the querying user — no extra user_id filter needed.

create view expense_stats
with (security_invoker = true)
as
select
  coalesce(sum(amount) filter (where expense_date >= date_trunc('month', current_date)), 0)
    as this_month_amount,
  coalesce(sum(amount) filter (where expense_date >= current_date - interval '12 months'), 0)
    as trailing_12mo_amount
from expenses;

-- Per-property trailing-12-month income vs. outflow (expenses + repair costs),
-- one row per plot/apartment the user owns. Built as a UNION ALL of a
-- plot-scoped and apartment-scoped rollup since income/expenses/maintenance
-- costs all use the same plot_id-XOR-apartment_id subject pattern.
create view property_financial_stats
with (security_invoker = true)
as
select
  lp.id as subject_id,
  'plot'::text as subject_type,
  coalesce(income.total, 0) as income_12mo,
  coalesce(exp.total, 0) + coalesce(maint.total, 0) as expenses_12mo
from land_plots lp
left join (
  select l.plot_id, sum(coalesce(pay.paid_amount, pay.amount)) as total
  from lease_payments pay
  join leases l on l.id = pay.lease_id
  where pay.paid and pay.paid_date >= current_date - interval '12 months' and l.plot_id is not null
  group by l.plot_id
) income on income.plot_id = lp.id
left join (
  select plot_id, sum(amount) as total
  from expenses
  where expense_date >= current_date - interval '12 months' and plot_id is not null
  group by plot_id
) exp on exp.plot_id = lp.id
left join (
  select plot_id, sum(cost) as total
  from maintenance_requests
  where cost is not null and reported_date >= current_date - interval '12 months' and plot_id is not null
  group by plot_id
) maint on maint.plot_id = lp.id

union all

select
  ap.id as subject_id,
  'apartment'::text as subject_type,
  coalesce(income.total, 0) as income_12mo,
  coalesce(exp.total, 0) + coalesce(maint.total, 0) as expenses_12mo
from apartments ap
left join (
  select l.apartment_id, sum(coalesce(pay.paid_amount, pay.amount)) as total
  from lease_payments pay
  join leases l on l.id = pay.lease_id
  where pay.paid and pay.paid_date >= current_date - interval '12 months' and l.apartment_id is not null
  group by l.apartment_id
) income on income.apartment_id = ap.id
left join (
  select apartment_id, sum(amount) as total
  from expenses
  where expense_date >= current_date - interval '12 months' and apartment_id is not null
  group by apartment_id
) exp on exp.apartment_id = ap.id
left join (
  select apartment_id, sum(cost) as total
  from maintenance_requests
  where cost is not null and reported_date >= current_date - interval '12 months' and apartment_id is not null
  group by apartment_id
) maint on maint.apartment_id = ap.id;
