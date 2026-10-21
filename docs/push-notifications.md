# Rent reminder setup

The reminder feature uses browser Web Push and two Vercel Cron routes. It notifies the property owner's opted-in device; it does not send SMS, email, or messages to tenants.

## Configure the deployment once

If the deployment already has a VAPID pair or cron credential, reuse those values; do not rotate them just to fix a missing public-key setting. For a new installation, generate a stable key pair and cron credential locally:

```sh
npm run setup:push -- --subject mailto:your-real-contact@example.com
```

Replace the example contact with a real address you control (or an HTTPS contact URL). The script writes `.env.push.local` with owner-only permissions and refuses to overwrite it. It does not print credential values. This ignored file is not automatically loaded by Next.js.

Import its values into the intended Vercel project's environment variables:

- `VAPID_PUBLIC_KEY`: public key from the generated pair.
- `VAPID_PRIVATE_KEY`: private key from the same pair. Keep it server-side.
- `VAPID_SUBJECT`: the real contact address or HTTPS URL.
- `CRON_SECRET`: the generated random bearer credential.

The project also needs `SUPABASE_SERVICE_ROLE_KEY` and the normal Supabase URL/publishable-key settings already used by the app. Use the Production environment for the live domain; use separate settings if you need Preview testing. Redeploy after changing settings. Do not put private keys or service-role credentials in any `NEXT_PUBLIC_` variable.

The app reads the recommended `VAPID_PUBLIC_KEY` on the server and passes only its public value to the profile control. Existing deployments can continue using `NEXT_PUBLIC_VAPID_PUBLIC_KEY` as a fallback; for that legacy variable, ensure it is present at build time. This removes the browser's direct dependency on a public key baked into its JavaScript.

For local testing, copy the generated values into the existing `.env.local` without overwriting its other settings, or load them using your runtime's environment support. Never commit the generated file.

## Check the database and scheduler

Ensure the existing migrations `0024_push_notifications.sql` and `0025_lease_expiry_reminders.sql` have been applied. They provide `push_subscriptions` and the reminder timestamp columns. No new schema changes are required by this fix.

The two routes in `vercel.json` run daily at `03:00 UTC` (09:00 Asia/Dhaka):

- `/api/cron/rent-reminders`: unpaid rent due within three days, including overdue rows, that has not yet been successfully reminded.
- `/api/cron/lease-expiry`: active leases ending within fourteen days that have not yet been successfully reminded.

Vercel sends `Authorization: Bearer <CRON_SECRET>`. These exact routes bypass browser-login middleware and enforce their own bearer authentication. A missing cron secret never authorizes a request. Confirm that Cron is enabled for the production deployment and inspect its execution logs.

## Enable on a device

Open the deployed app over HTTPS, sign in, and go to Profile → Rent reminders. On iPhone/iPad, Web Push requires installing the site on the Home Screen and opening that installed app on a supported iOS/iPadOS version. Other unsupported browsers show an availability message.

The button is available only after the server reports complete reminder configuration. It requests browser permission only when the user chooses Enable. Dismissing the prompt permits a later retry; a blocked permission must be changed in the browser's site settings.

A browser subscription is considered enabled by the control after its server save succeeds. Failed saves undo a newly-created local subscription. Disabling checks the server response before claiming success.

Keep the VAPID key pair stable across redeployments. Replacing it can require devices to unsubscribe and subscribe again. Never generate a fresh pair on every build or server start.

## Troubleshooting

- Availability message before enabling: check the key pair, contact subject, cron credential, and service-role setting in the deployed environment. A preview build and the production site may have different settings.
- Enable fails after permission: check service-worker availability and `/api/push/subscribe` responses. The registration wait times out instead of spinning indefinitely.
- Enabled but no delivery: inspect Cron logs and the push provider response. A failed send is retained for retry, not marked delivered. Expired subscriptions (404/410) are pruned.

No reminder was sent to real users while validating this change; delivery tests use isolated provider and database mocks.
