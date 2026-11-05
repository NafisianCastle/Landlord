# Landlord

Landlord is a land-plot management web app for recording plot boundaries, tracking land inventory, storing supporting documents, and managing ownership metadata in one place.

## What this app does

- Map and manage land plots from a dashboard
- Draw plot boundaries on a map and save the resulting GeoJSON boundary
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
- `mobile/` – Flutter Android/iOS app on the same Supabase backend (GPS boundary walking, document scanning, biometric lock, native push, offline data and maps); see `mobile/README.md`

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

## Brand and marketing

The brand promise is **Your property, in order.** Open `brand/index.html` to browse
the logo, feed posts, carousel, stories, and the 16-second vertical reel.
`brand/BRAND-GUIDE.md` documents the identity and `brand/SOCIAL-CONTENT.md` contains
English/Bangla captions, alt text, voiceover options, and a two-week launch plan.
Ready-to-use PNG/MP4 files and editable SVG artwork are in `brand/assets/`.
Regeneration commands are documented in `brand/README.md`.

## Input and attachment validation

Server Actions validate text lengths, finite nonnegative amounts (up to 1 trillion),
calendar dates, lease date order, email/phone formats, and allowed enum values.
Guest imports are limited to 100 records per request; boundary inputs are limited
to 2,000 points with finite, valid latitude/longitude values.

Attachments must have a safe `.pdf` filename and be at most 20 MiB. Plaintext
uploads require `application/pdf`, a PDF version header, and an EOF marker.
Uploaded objects use generated names rather than user-controlled filenames.
Encrypted attachments retain client-side encryption: the browser validates the
PDF before encryption, while the server checks the opaque content type, 12-byte
IV, and size including the 16-byte AES-GCM tag. These checks do not provide malware
scanning or prove that encrypted plaintext is a PDF.

Apply `supabase/migrations/0034_input_and_document_validation.sql` before deploying
the application change to enforce storage MIME/size limits and database input
constraints. Existing rows are preserved with `NOT VALID` constraints; future
inserts and updates must meet the new limits. Direct Storage API uploads are
subject to MIME/size limits, but declared MIME types alone do not verify contents.
Server Actions allow 21 MiB requests for multipart overhead; the hosting platform
may impose a lower request limit.
