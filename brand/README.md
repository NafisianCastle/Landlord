# Landlord brand kit

Open `index.html` locally to browse the artwork and play the reel. Ready-to-publish files and editable SVGs live in `assets/`. Use `BRAND-GUIDE.md` for identity rules and `SOCIAL-CONTENT.md` for captions, alt text, story prompts, voiceover scripts, and a two-week launch cadence.

Facebook Page setup (name, intro, About, cover) is in `FACEBOOK-PAGE.md`; the ten launch posts with captions, alt text and schedule are in `FACEBOOK-POSTS.md`.

Regenerate images, the Facebook videos and the app/mobile icons from the repository root (writes into this folder):

```sh
node scripts/generate-brand-assets.mjs brand/assets
```

Bangla artwork needs the Noto Sans Bengali font installed (for example in `~/.fonts`, then `fc-cache -f`); without it Bangla text renders as empty boxes. Video rendering needs ffmpeg and is skipped with a warning if it is missing.

Render the silent reel (requires ffmpeg):

```sh
bash scripts/render-brand-reel.sh brand/assets
```

The image generator also refreshes the app/PWA icons and social link previews. It uses the project's existing Sharp dependency and system fonts; it adds no package dependencies. PNG and MP4 exports are ready to use. Editable SVGs require DejaVu Sans and Noto Sans Bengali for the same typography.
