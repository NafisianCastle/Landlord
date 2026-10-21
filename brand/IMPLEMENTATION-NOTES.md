# Website and UI changes

The landing page now introduces the brand promise, shows an explicitly illustrative property overview, explains the main tasks, offers a real guest-mode entry, outlines setup, and answers practical questions. English and Bangla copy cover the full page. Native HTML disclosures handle FAQs without extra client components.

The shared UI now uses the forest/cream identity, coordinated dark-mode colours, the refreshed parcel/L symbol, visible keyboard focus, and active navigation semantics. The six dashboard summary cards fit a six-column desktop grid. The mobile guest header accommodates translated content, and the signup label is concise. Auth screens include a clear route back to the homepage.

## Loading work

- The public root provider sends only theme, language, and error messages. Feature translations load inside app route groups; authentication pages receive their needed namespaces.
- Compact English translation JSON sent by the root provider decreased from 29,251 bytes to 280 bytes. This is a 99% reduction in that particular payload, not a 99% reduction in total page size or a measured speed increase.
- The marketing preview is server-rendered HTML and inline SVG. It does not initialise a map, fetch tiles, download a screenshot, or introduce an animation library.
- Guest exploration is not prefetched from the hero, avoiding an unnecessary app-route fetch for visitors who only read the page.
- Sentry initialisation is conditional on a configured DSN. Vercel Analytics only mounts on Vercel; its native endpoint is excluded from the application session proxy to avoid returning login HTML as JavaScript.
- No package dependencies were added. Campaign images and video are outside the website's loading path.

## Validation

- Production build succeeded, including TypeScript validation.
- Existing suite: 48 test files, 358 tests passed.
- Chromium: landing, signup, login, guest dashboard, guest plots, and privacy page in English and Bangla; language switching, theme toggle, and FAQ interaction passed.
- Checked desktop and mobile layouts, including a 320 px landing page. Fixed Bangla guest header overflow during review.
- Marketing gallery: 15 visible images loaded; H.264 reel decoded and played at 1080 × 1920, 25 fps, 16 seconds.
- Git whitespace checks passed.

Authenticated property mutations, actual reminder delivery, and real account data were not exercised. No production deployment or social publishing was performed. The reel is a silent brand introduction; optional voiceover scripts, subtitle files, and editable scenes are included.
