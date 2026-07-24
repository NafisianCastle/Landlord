# Landlord

Landlord is a land-plot management web app for recording plot boundaries, tracking land inventory, storing supporting documents, and managing ownership metadata in one place.

## What this app does

- Map and manage land plots from a dashboard
- Walk plot boundaries on a map and save the resulting GeoJSON boundary
- Store plot documents such as PDFs with optional client-side encryption
- Track area, purchase value, current value, and location-based summaries
- Support offline-first behavior with local persistence and sync queueing
- Offer paywall access with SSLCommerz payment integration

## Tech stack

- Next.js 16 with App Router
- React 19
- Supabase for auth, database, storage, and server-side data access
- MapLibre GL for map and boundary visualization
- Dexie for offline local storage
- Tailwind CSS and shadcn-style UI primitives

## Project structure

- `app/` – route handlers, pages, and protected UI flows
- `components/` – UI and feature components
- `lib/` – map, crypto, offline, payment, and Supabase helpers
- `supabase/migrations/` – database schema and migrations

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open http://localhost:3000

## Environment variables

This project expects Supabase and payment-related environment variables to be configured before running locally or deploying.

Typical variables include:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SSL_COMMERZ_STORE_ID=
SSL_COMMERZ_STORE_PASSWORD=
```

## Deployment

The app is designed to deploy on a modern Node.js hosting platform such as Vercel, with Supabase backend resources configured separately.

## Notes

The repository name is `Landlord`, and the product is positioned as a practical land-plot and parcel management workflow with map-first data capture and secure document handling.
