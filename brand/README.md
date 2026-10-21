# Landlord brand kit

Open `index.html` locally to browse the artwork and play the reel. Ready-to-publish files and editable SVGs live in `assets/`. Use `BRAND-GUIDE.md` for identity rules and `SOCIAL-CONTENT.md` for captions, alt text, story prompts, voiceover scripts, and a two-week launch cadence.

Regenerate images from the repository root:

```sh
node scripts/generate-brand-assets.mjs work/brand-kit
```

Render the silent reel (requires ffmpeg):

```sh
bash scripts/render-brand-reel.sh work/brand-kit
```

The image generator also refreshes the app/PWA icons and social link previews. It uses the project's existing Sharp dependency and system fonts; it adds no package dependencies. PNG and MP4 exports are ready to use. Editable SVGs require DejaVu Sans and Noto Sans Bengali for the same typography.
