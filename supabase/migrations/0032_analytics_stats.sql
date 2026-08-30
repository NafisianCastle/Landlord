-- Portfolio-wide analytics: occupancy rate and a 12-month income/expense
-- trend, both security_invoker so RLS on the underlying tables scopes
-- everything to the querying user.

create view occupancy_stats
with (security_invoker = true)
as
select
  (select count(*) from land_plots) + (select count(*) from apartments) as total_units,
  (
    select count(*)
    from (
      select id from land_plots
      union all
      select id from apartments
    ) u
    where exists (
      select 1 from leases l
      where l.status = 'active' and (l.plot_id = u.id or l.apartment_id = u.id)
    )
  ) as leased_units;

create view portfolio_monthly_stats
with (security_invoker = true)
as
with months as (
  select generate_series(
    date_trunc('month', current_date - interval '11 months'),
    date_trunc('month', current_date),
    interval '1 month'
  )::date as month
),
income as (
  select date_trunc('month', paid_date)::date as month, sum(coalesce(paid_amount, amount)) as amount
  from lease_payments
  where paid and paid_date >= current_date - interval '12 months'
  group by 1
),
expense as (
  select month, sum(amount) as amount
  from (
    select date_trunc('month', expense_date)::date as month, amount
    from expenses
    where expense_date >= current_date - interval '12 months'
    union all
    select date_trunc('month', reported_date)::date as month, cost as amount
    from maintenance_requests
    where cost is not null and reported_date >= current_date - interval '12 months'
  ) combined
  group by 1
)
select
  m.month,
  coalesce(income.amount, 0) as income_amount,
  coalesce(expense.amount, 0) as expense_amount
from months m
left join income on income.month = m.month
left join expense on expense.month = m.month
order by m.month;
