-- Dashboard rent aggregate, mirrors 0007_plot_stats.sql's pattern.
-- security_invoker means lease_payments' own RLS already scopes this to the
-- querying user — no extra user_id filter needed here.

create view lease_payment_stats
with (security_invoker = true)
as
select
  count(*) filter (where not paid and due_date < current_date) as overdue_count,
  coalesce(sum(amount) filter (where not paid and due_date < current_date), 0) as overdue_amount,
  count(*) filter (
    where not paid and due_date >= current_date and due_date < current_date + interval '30 days'
  ) as upcoming_count,
  coalesce(
    sum(coalesce(paid_amount, amount)) filter (
      where paid and paid_date >= date_trunc('month', current_date)
    ),
    0
  ) as received_this_month_amount
from lease_payments;
