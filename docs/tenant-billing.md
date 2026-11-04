# Tenant utility bills

Owners add a tenant's email from an apartment’s **Shared with** form, choosing
**Tenant — bills only**. A Landlord account is optional. **Share link** creates a
private, read-only bill portal that works for 90 days; creating another link replaces
the old one, and **Revoke** disables it immediately. The mobile share button creates
the same link and copies it for sending. Keep the link private because anyone who has
it can view that tenant's shared bills and copies until it expires or is revoked.

Tenants who already have a Landlord account can also use **Bills** in the menu and
upload payment proof. The guest portal does not accept payment proof. Tenant access
does not include apartment ownership data, purchase prices, leases or deeds.
Viewer/editor sharing retains its broader existing permissions; remove that access
before adding the same account as a tenant.

Each monthly bill has a title, one tenant, an amount in BDT, a due date and an image
or PDF copy. Uncheck sharing to keep a bill private, or hide it later. Uploaded files
are limited to 10 MiB (JPEG, PNG, WebP or PDF). File signatures, MIME types and
extensions are checked. Copies and receipts use a private storage bucket and an
authenticated file endpoint; responses are never cached or given public URLs.

A tenant submits proof, leaving the bill **Awaiting review**. The owner reviews the
attachment and chooses **Approve & mark paid**, or rejects it with a reason. A
rejected receipt remains in history and the tenant can submit another one. Approval
and payment status update in one database transaction. Amounts, dates and recipients
of issued bills are immutable; reviewed receipts cannot be replaced by tenants.
Collections do not alter rent, expense or financial analytics totals.

## Tenant history

The web and mobile property views group each lease with the tenant's contact
details, tenancy dates, rent schedule and transactions, outstanding rent,
apartment bills, bill copies, payment proofs and review notes. Bills are matched
to an apartment lease by the tenant email and the bill due date falling within
the lease period. Apartment leases therefore require the same email used for the
tenant's Bills invitation. Ended leases remain visible, and a lease with a paid
rent transaction or apartment bill cannot be deleted from either interface.

Existing expenses start private. **Share with tenants** exposes their category,
amount, date and notes to all current tenants of that apartment, as reference
information, without asking them to pay again. **Make private** revokes that access.
Removing a tenant revokes bill, proof, expense and file access. Bills and proof
history remain with the owner. Reinviting an account creates a new membership and
does not restore its old bills automatically. Downloaded copies cannot be recalled.

## Deployment

1. Apply `supabase/migrations/20261021150040_tenant_utility_bills.sql` before deploying
   the application. It creates the tenant, bill and proof tables, restrictive grants,
   RLS, review function, expense visibility and private `apartment-bills` bucket.
2. Apply `supabase/migrations/20261104074008_tenant_portal_links.sql`. It permits
   account-free tenant records and creates the server-only hashed portal token table.
3. Deploy the application and `vercel.json` cron configuration.
4. Complete [Web Push setup](push-notifications.md) for browser reminders:
   VAPID public/private keys and subject, `CRON_SECRET`, and the server-only Supabase
   service-role key. Tenant devices must opt in under Bills → Bill notifications.

In-app alerts work without Web Push. They show unpaid visible bills due within
three days, including overdue bills. `/api/cron/bill-reminders` runs daily at 03:00
UTC, requires the exact cron bearer secret, and notifies the assigned tenant rather
than the owner, through browser push and, when the tenant has the mobile app with
notifications on, native push (FCM; see [push setup](push-notifications.md)). One reminder is recorded per bill only after provider acceptance;
failed delivery or absent subscriptions can retry. Notifications omit amounts and
bill titles from lock screens. Hidden, paid, draft and revoked bills are excluded.
Overlapping cron executions can duplicate push delivery; deployment should run one
daily schedule. A notification already delivered cannot be recalled.

Only the service role can maintain notification timestamps. Uploaded evidence is
immutable through Storage. If an upload succeeds but the following database write
fails, an unreferenced private object may remain. Administrators can periodically
remove objects not referenced by either bill or proof table; clients cannot delete
these files because that could otherwise erase evidence after access is revoked.

## Verification

Unit/component tests cover upload validation, pending/paid/rejected screens,
approval actions, cron authorization, tenant targeting, revocation, transient
failures and expired subscriptions. `supabase/tests/tenant_bills.sql` runs against a
disposable migrated PostgreSQL/Supabase database with `psql -v ON_ERROR_STOP=1 -f`.
It tests actual role grants and RLS, private ownership/documents/expenses, assigned
recipients, forged approvals, immutable amounts, rejection/resubmission, atomic
approval, stale review, file access and revocation. Fixture changes roll back.
