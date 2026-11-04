# Landlord

**Your property, in order.**

**সম্পত্তির সব তথ্য, গুছিয়ে রাখুন।**

Landlord brings land, apartments, property documents and rent records into one practical place for property owners in Bangladesh. The brand promise is clarity: less time piecing together scattered records, more confidence about what needs attention.

## Audience and positioning

Primary: individual land and apartment owners in Bangladesh managing their own records and rental properties. Secondary: families sharing property responsibilities and owners managing property from another city or abroad. Lead with a recognisable task: finding a deed, checking recorded rent, or organising a plot. Show the actual workflow before listing features.

Positioning: “For property owners who want the details together, Landlord is a free property management workspace for land, apartments, documents and rent.”

Do not position the app as a marketplace, a payment collection service, a legal advisor, or a replacement for a land survey. Recorded rent is not proof that the app processed a payment.

## Identity

The symbol combines a mapped parcel, four boundary points, and an L. The 2026 refresh keeps the colours but draws the mark with bolder geometry: a heavier white parcel outline, a thicker lime L, and larger boundary points with a forest ring, so it reads at app-icon and avatar sizes. Use the lowercase **landlord.** wordmark (bold type with a round full stop: lime on forest, forest on paper) in artwork; use **Landlord** in ordinary text.

Below 48 px, use the simplified symbol (`assets/logos/landlord-symbol-small.svg`: tile, L and four corner points, with no parcel outline). The favicon and the smallest Android launcher sizes use it. Lockups: horizontal wordmark, reversed wordmark on forest, and a stacked version for square spaces.

| Role | Colour | Use |
| --- | --- | --- |
| Forest | `#164B3F` | Primary buttons, symbol tile, campaign backgrounds |
| Paper | `#F7F8F2` | Main marketing background |
| Lime | `#D9F279` | Boundary points, emphasis, CTA on forest |
| Ink | `#163D33` | Headlines and body text on light surfaces |
| Sage | `#A3BC9C` | Decorative plots and supporting illustration |
| Quiet | `#54695B` | Secondary copy on paper |

Use forest and paper for most of the surface, with lime used sparingly. Lime is a fill or accent, not small body text on paper. Use white or paper text on forest; use forest text on lime.

Keep one quarter of the symbol width clear on all sides. Minimum symbol size: 24 px digitally; prefer 32 px. Minimum wordmark width: 120 px. Do not stretch, rotate, outline, recolour individual elements, or place the mark on a busy photograph. The social avatar is centred within circular crop safety. Use the reversed wordmark on forest.

## Typography and layout

Website: Geist Sans already used in the app, with a system Georgia italic accent in the hero. No additional webfont was added. Exports: DejaVu Sans and Noto Sans Bengali. Editable SVG text uses these fonts; PNGs and MP4 are rendered and portable.

Headlines: short, sentence case, one idea. Body: plain, specific and calm. Bengali copy is written as Bengali rather than transliterated English. Keep breathing room around type, use an 8 px spacing rhythm, and make a single action clear. Avoid decorative animation, tiny text in real workflows, and dense feature collages.

Keep status cues distinct from branding: paid, overdue, and upcoming need text labels as well as colour. Honour dark mode, keyboard focus, and reduced-motion preferences. App navigation now identifies the active page for assistive technology.

## Voice

Calm, capable, local and direct. Show the benefit, then the task.

Say: “Keep tenant details and recorded rent together.”

Say: “Start with one property.”

Avoid: “Never lose a document again,” “100% secure,” “guaranteed collection,” or “no surveyor needed.”

Free access is supported by the current application. Recheck this claim if pricing changes. Optional document encryption happens before upload, and recovery depends on retaining the passphrase. Guest records live in browser storage; cloud operations need a connection. Previously viewed map tiles may be cached; offline is not a complete offline app shell.

## Content system

1. **Clarity:** relatable scattered-record problems and simple routines.
2. **Show the task:** short product walkthroughs, one action per reel.
3. **Property habits:** document and rent-record checklists.
4. **Trust through explanation:** guest storage, encryption, and map limitations in plain language.

Start with Instagram and Facebook. Repurpose to other channels only where the intended audience is active. Do not invent customer quotes, user counts, savings, or security certifications. The included overview and rent amount are explicitly illustrative.

## Export inventory

- Logo symbol, simplified small symbol, wordmark, reversed and stacked lockups: SVG and PNG; social avatar included.
- Facebook page kit (`assets/facebook/`): 720 × 720 profile picture, 1640 × 624 cover photo in English and Bangla, and ten launch posts. Those are two image launch posts, two text posts, a 4-card carousel, an English and a Bangla reel, a 3-frame story, a 30-second square feed video, and a Bangla documents post. Page details are in `FACEBOOK-PAGE.md`; captions, alt text and the schedule are in `FACEBOOK-POSTS.md`.
- Instagram and LinkedIn versions of the ten posts (`INSTAGRAM-POSTS.md`, `LINKEDIN-POSTS.md`). Instagram gets image cards for the two text posts (`assets/instagram/`). LinkedIn is English-only, so it has its own versions of the Bangla posts. Its new files are in `assets/linkedin/`: an English rent reel, a documents image, a post for owners managing from abroad, the carousel as a PDF document, a poll in place of the story, and a 400 × 400 logo and 1128 × 191 cover banner.
- Flutter launcher icons (Android mipmaps and adaptive foregrounds, iOS AppIcon set) are written by the generator.
- Feed: 4 posts at 1080 × 1350, including a Bangla brand post.
- Carousel: 5 ordered cards at 1080 × 1350.
- Stories: 3 frames at 1080 × 1920. Add the platform's link sticker in the open lower area.
- Reel: 16-second silent MP4 (`assets/landlord-reel.mp4`) at 1080 × 1920, H.264, 25 fps, plus 4 editable scenes and subtitle file. Add licensed music or voiceover in the platform editor if desired.
- Social link preview: 1200 × 630, installed as Open Graph and Twitter image.
- Website and PWA: SVG icon, favicon, Apple icon, and regular/maskable icons.

The source generator is `scripts/generate-brand-assets.mjs`; it uses the project's existing Sharp dependency and, when available, ffmpeg for the social videos. Regenerate using `node scripts/generate-brand-assets.mjs brand/assets`. The vector artwork uses no stock photos or external image requests.

## Before posting

Set the profile website to the app's real production URL. Use the matching caption and alt text in SOCIAL-CONTENT.md. Place the link sticker below story artwork, review the in-app crop, and publish each carousel in numerical order. The reel is a brand introduction, not a recording of the live UI. Replace it with actual task footage for future feature tutorials.

## Measurement

Use a consistent campaign name and UTMs, for example `utm_source=instagram&utm_medium=organic_social&utm_campaign=property_in_order&utm_content=brand_post_01`. Append them to the verified production URL. Measure qualified visits and completed signup/first-property activation where existing analytics supports it. Do not add invasive tracking to chase vanity metrics. Compare two hooks with the same CTA before changing the visual system.
