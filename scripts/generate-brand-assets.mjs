import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

// Run from the repository root: node scripts/generate-brand-assets.mjs [output-directory]
// All artwork is vector-based. No network, stock imagery, or extra dependencies.
const out = path.resolve(process.argv[2] || "work/brand-kit");
for (const dir of [
  "logos",
  "posts",
  "carousel",
  "stories",
  "reel-scenes",
  "web",
  "facebook/posts/05-carousel",
  "facebook/posts/06-reel",
  "facebook/posts/07-reel-bn",
  "facebook/posts/08-story",
  "facebook/posts/09-video",
])
  await fs.mkdir(path.join(out, dir), { recursive: true });
const C = {
  forest: "#164B3F",
  paper: "#F7F8F2",
  lime: "#D9F279",
  ink: "#163D33",
  sage: "#A3BC9C",
  muted: "#54695B",
  line: "#DCE5D7",
};
const esc = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
// The symbol: a mapped parcel (white outline), four lime boundary points and
// an L. Keep components/system/Logo.tsx in sync with these paths.
const parcelPoints = [
  [15, 20],
  [45, 14],
  [50, 44],
  [20, 50],
];
const markInner = `<rect width="64" height="64" rx="16" fill="${C.forest}"/><path d="M15 20 45 14 50 44 20 50Z" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><path d="M27 24v15h12" fill="none" stroke="${C.lime}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><g fill="${C.lime}" stroke="${C.forest}" stroke-width="2">${parcelPoints.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join("")}</g>`;
// Simplified symbol for 16–48 px (favicon, small launcher sizes): the parcel
// outline is dropped so the L and corner points stay legible.
const markSmall = `<rect width="64" height="64" rx="16" fill="${C.forest}"/><path d="M25 19v24h17" fill="none" stroke="${C.lime}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><g fill="#fff"><circle cx="14" cy="14" r="4.5"/><circle cx="50" cy="14" r="4.5"/><circle cx="50" cy="50" r="4.5"/><circle cx="14" cy="50" r="4.5"/></g>`;
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const mark = (x, y, size = 64) =>
  `<g transform="translate(${x} ${y}) scale(${size / 64})">${markInner}</g>`;
const text = (x, y, str, size = 28, color = C.ink, weight = 400, extra = "") =>
  `<text x="${x}" y="${y}" font-family="'DejaVu Sans', 'Noto Sans Bengali', sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}" ${extra}>${esc(str)}</text>`;
// Measure the rendered width of "landlord" once so the lime full stop sits
// just after the last letter at any size.
const wordWidth = await (async () => {
  const probe = svg(1200, 200, text(0, 150, "landlord", 100, "#000", 700));
  const { info } = await sharp(Buffer.from(probe))
    .flatten({ background: "#fff" })
    .trim({ threshold: 10 })
    .toBuffer({ resolveWithObject: true });
  return (info.width - info.trimOffsetLeft) / 100;
})();
const wordmark = (x, y, size, dark = false) =>
  text(x, y, "landlord", size, dark ? C.paper : C.ink, 700) +
  `<circle cx="${x + size * (wordWidth + 0.13)}" cy="${y - size * 0.085}" r="${size * 0.085}" fill="${dark ? C.lime : C.forest}"/>`;
const lines = (
  x,
  y,
  arr,
  size = 28,
  color = C.ink,
  weight = 400,
  leading = 1.35,
) =>
  arr
    .map((s, i) => text(x, y + i * size * leading, s, size, color, weight))
    .join("");
const brand = (dark = false) =>
  mark(80, 100, 65) + wordmark(163, 149, 44, dark);
const arrow = (x, y, color = C.ink) =>
  `<path d="M${x} ${y}h43m-13-13 13 13-13 13" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
const button = (x, y, label, dark = false) =>
  `<rect x="${x}" y="${y}" width="445" height="82" rx="14" fill="${dark ? C.lime : C.forest}"/>${text(x + 28, y + 53, label, 28, dark ? C.ink : C.paper, 600)}${arrow(x + 365, y + 41, dark ? C.ink : C.paper)}`;
const parcel = (x, y, scale = 1, dark = false) =>
  `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 60 260 0 325 210 60 275Z" fill="${dark ? "#245F4E" : "#E7EEDC"}" stroke="${dark ? "#6D997F" : "#ACC09C"}" stroke-width="2"/><path d="m83 90 124-28 31 105-124 29Z" fill="${dark ? "#376F55" : "#C7DEAD"}" stroke="${dark ? C.lime : C.forest}" stroke-width="4"/><g fill="${C.lime}" stroke="${C.forest}" stroke-width="4">${[
    [83, 90],
    [207, 62],
    [238, 167],
    [114, 196],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8"/>`)
    .join(
      "",
    )}</g><circle cx="161" cy="131" r="27" fill="${C.forest}"/><path d="m148 130 10 10 17-21" fill="none" stroke="${C.lime}" stroke-width="4" stroke-linecap="round"/></g>`;
const footer = (h, dark = false, note = "BUILT FOR BANGLADESH · FREE TO USE") =>
  `<path d="M80 ${h - 155}H1000" stroke="${dark ? "#4B7563" : C.line}"/>${text(80, h - 100, note, 18, dark ? "#BDD1C3" : C.muted, 400)}`;
async function save(name, w, h, body) {
  const source = svg(w, h, body);
  await fs.writeFile(path.join(out, name + ".svg"), source);
  await sharp(Buffer.from(source))
    .png()
    .toFile(path.join(out, name + ".png"));
}
const icon = svg(64, 64, markInner);
await fs.writeFile(path.join(out, "logos/landlord-symbol.svg"), icon);
await sharp(Buffer.from(icon))
  .resize(1024)
  .png()
  .toFile(path.join(out, "logos/landlord-symbol.png"));
const iconSmall = svg(64, 64, markSmall);
await fs.writeFile(
  path.join(out, "logos/landlord-symbol-small.svg"),
  iconSmall,
);
await save(
  "logos/landlord-wordmark",
  640,
  150,
  mark(10, 15, 120) + wordmark(158, 105, 76),
);
await save(
  "logos/landlord-wordmark-reversed",
  640,
  150,
  `<rect width="640" height="150" fill="${C.forest}"/>` +
    mark(10, 15, 120) +
    wordmark(158, 105, 76, true),
);
await save(
  "logos/landlord-stacked",
  600,
  600,
  `<rect width="600" height="600" fill="${C.paper}"/>` +
    mark(190, 90, 220) +
    wordmark(300 - (76 * (wordWidth + 0.21)) / 2, 470, 76),
);
await save(
  "logos/social-avatar",
  1080,
  1080,
  `<rect width="1080" height="1080" fill="${C.forest}"/>` + mark(220, 220, 640),
);
await fs.writeFile("public/icons/source-icon.svg", icon);
await fs.writeFile("public/brand/landlord-symbol.svg", icon);
await fs.writeFile("brand/logo.svg", icon);
await fs.writeFile("app/icon.svg", icon);
for (const size of [192, 512]) {
  await sharp(Buffer.from(icon))
    .resize(size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
  const maskable = svg(
    512,
    512,
    `<rect width="512" height="512" fill="${C.forest}"/>` + mark(96, 96, 320),
  );
  await sharp(Buffer.from(maskable))
    .resize(size)
    .png()
    .toFile(`public/icons/icon-maskable-${size}.png`);
  if (size === 512)
    await fs.writeFile("public/icons/source-icon-maskable.svg", maskable);
}
await sharp(Buffer.from(icon)).resize(180).png().toFile("app/apple-icon.png");
// favicon.ico holds 16, 32 and 48 px PNG entries of the simplified symbol.
const icoSizes = [16, 32, 48];
const icoPngs = await Promise.all(
  icoSizes.map((s) => sharp(Buffer.from(iconSmall)).resize(s).png().toBuffer()),
);
const ico = Buffer.alloc(6 + 16 * icoSizes.length);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(icoSizes.length, 4);
let icoOffset = ico.length;
icoSizes.forEach((s, i) => {
  const at = 6 + 16 * i;
  ico[at] = s;
  ico[at + 1] = s;
  ico.writeUInt16LE(1, at + 4);
  ico.writeUInt16LE(32, at + 6);
  ico.writeUInt32LE(icoPngs[i].length, at + 8);
  ico.writeUInt32LE(icoOffset, at + 12);
  icoOffset += icoPngs[i].length;
});
await fs.writeFile("app/favicon.ico", Buffer.concat([ico, ...icoPngs]));

// Flutter launcher icons. flutter_launcher_icons (see mobile/pubspec.yaml)
// reads the two source PNGs; the platform files are written here too so the
// mobile app picks up the symbol without a Flutter toolchain.
const fullBleed = (size) =>
  svg(
    size,
    size,
    `<rect width="${size}" height="${size}" fill="${C.forest}"/>` +
      mark(size * 0.2, size * 0.2, size * 0.6),
  );
await sharp(Buffer.from(icon))
  .resize(1024)
  .png()
  .toFile("mobile/assets/icon/landlord-symbol.png");
// Adaptive foreground: symbol inside the 66/108 safe zone.
const adaptive = (size) =>
  svg(
    size,
    size,
    `<rect width="${size}" height="${size}" fill="${C.forest}"/>` +
      mark(size * 0.28, size * 0.28, size * 0.44),
  );
await sharp(Buffer.from(adaptive(512)))
  .png()
  .toFile("mobile/assets/icon/landlord-adaptive.png");
const res = "mobile/android/app/src/main/res";
for (const [dpi, launcher, foreground] of [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
]) {
  await sharp(Buffer.from(launcher < 96 ? iconSmall : icon))
    .resize(launcher)
    .png()
    .toFile(`${res}/mipmap-${dpi}/ic_launcher.png`);
  await sharp(Buffer.from(adaptive(foreground)))
    .png()
    .toFile(`${res}/drawable-${dpi}/ic_launcher_foreground.png`);
}
// iOS app icons must be opaque and full-bleed; iOS applies its own mask.
const iosDir = "mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset";
for (const file of await fs.readdir(iosDir)) {
  const m = file.match(/^Icon-App-([\d.]+)x[\d.]+@(\d)x\.png$/);
  if (!m) continue;
  const px = Math.round(Number(m[1]) * Number(m[2]));
  await sharp(Buffer.from(fullBleed(1024)))
    .resize(px)
    .flatten({ background: C.forest })
    .png()
    .toFile(path.join(iosDir, file));
}

await save(
  "posts/01-brand-en",
  1080,
  1350,
  `<rect width="1080" height="1350" fill="${C.forest}"/>` +
    brand(true) +
    text(80, 304, "A LITTLE LESS PROPERTY ADMIN", 20, C.lime, 600) +
    lines(80, 440, ["Your property,", "in order."], 84, C.paper, 600, 1.2) +
    text(80, 710, "Land. Apartments. Rent. Documents.", 28, "#C5D9CC") +
    parcel(600, 770, 1.1, true) +
    button(80, 1040, "Get started free", true) +
    footer(1350, true),
);
await save(
  "posts/02-rent",
  1080,
  1350,
  `<rect width="1080" height="1350" fill="${C.paper}"/>` +
    brand() +
    text(80, 300, "LESS GUESSWORK. MORE CLARITY.", 20, C.muted, 600) +
    lines(
      80,
      430,
      ["Rent day,", "without the", "guesswork."],
      82,
      C.ink,
      600,
      1.16,
    ) +
    `<rect x="80" y="790" width="920" height="280" rx="22" fill="#fff" stroke="${C.line}"/>` +
    text(120, 852, "THIS MONTH · ILLUSTRATIVE EXAMPLE", 18, C.muted) +
    text(120, 928, "৳48,000", 70, C.ink, 600) +
    text(120, 1015, "Collected", 24, C.muted) +
    `<rect x="700" y="897" width="250" height="70" rx="35" fill="#EAF1DD"/>` +
    text(738, 943, "Recorded", 25, C.forest, 600) +
    footer(1350, false, "TRACK PAYMENTS · KEEP TENANT DETAILS TOGETHER"),
);
await save(
  "posts/03-documents",
  1080,
  1350,
  `<rect width="1080" height="1350" fill="${C.paper}"/>` +
    brand() +
    text(80, 300, "THE IMPORTANT THINGS, CLOSE.", 20, C.muted, 600) +
    lines(
      80,
      430,
      ["A place for", "your property", "papers."],
      80,
      C.ink,
      600,
      1.18,
    ) +
    `<rect x="175" y="800" width="730" height="265" rx="20" fill="#fff" stroke="${C.line}"/><path d="M235 860h70v100h-70Z" fill="#EAF1DD" stroke="#A3BC9C" stroke-width="2"/><path d="M252 890h36m-36 17h36m-36 17h23" stroke="${C.forest}" stroke-width="3"/>` +
    text(345, 895, "Deeds & ownership records", 29, C.ink, 600) +
    text(345, 944, "PDFs, together in one place.", 23, C.muted) +
    text(235, 1025, "Optional encryption before upload.", 23, C.muted) +
    footer(1350, false, "KEEP YOUR ENCRYPTION PASSPHRASE SAFE"),
);
await save(
  "posts/04-brand-bn",
  1080,
  1350,
  `<rect width="1080" height="1350" fill="${C.forest}"/>` +
    brand(true) +
    text(80, 310, "সম্পত্তির হিসাব হোক সহজ", 32, C.lime, 600) +
    lines(
      80,
      470,
      ["আপনার সম্পত্তি,", "গুছিয়ে রাখুন।"],
      72,
      C.paper,
      600,
      1.3,
    ) +
    lines(
      80,
      750,
      ["জমি, অ্যাপার্টমেন্ট, ভাড়া ও কাগজপত্র।", "সব এক জায়গায়।"],
      31,
      "#C5D9CC",
      400,
      1.55,
    ) +
    button(80, 1040, "ফ্রিতে শুরু করুন", true) +
    footer(1350, true, "বাংলাদেশের জন্য তৈরি · ফ্রিতে ব্যবহার করুন"),
);

const carousel = [
  [
    "Property details,",
    "everywhere?",
    ["Bring them into one calm,", "organised place."],
  ],
  [
    "01. Start with",
    "one property.",
    [
      "Add a plot or apartment.",
      "Keep location and ownership",
      "details together.",
    ],
  ],
  [
    "02. Keep your",
    "papers close.",
    [
      "Attach property PDFs.",
      "Choose encryption before",
      "upload if you need it.",
    ],
  ],
  [
    "03. See your",
    "rent clearly.",
    [
      "Keep tenant details, payment",
      "schedules, and recorded rent",
      "in one place.",
    ],
  ],
  [
    "Your property,",
    "in order.",
    ["Landlord is free to use.", "Start with a plot today."],
  ],
];
for (let i = 0; i < carousel.length; i++) {
  const [a, b, sub] = carousel[i],
    dark = i === 0 || i === 4;
  await save(
    `carousel/${String(i + 1).padStart(2, "0")}`,
    1080,
    1350,
    `<rect width="1080" height="1350" fill="${dark ? C.forest : C.paper}"/>` +
      brand(dark) +
      text(
        80,
        305,
        `THE PROPERTY RESET     ${i + 1} / 5`,
        20,
        dark ? C.lime : C.muted,
        600,
      ) +
      lines(80, 450, [a, b], 76, dark ? C.paper : C.ink, 600, 1.18) +
      lines(80, 710, sub, 29, dark ? "#C5D9CC" : C.muted, 400, 1.55) +
      (i === 4
        ? button(80, 1035, "Get started free", true)
        : parcel(660, 870, 0.75, dark)) +
      footer(
        1350,
        dark,
        i < 4
          ? "SWIPE FOR A CLEARER PICTURE →"
          : "LAND. APARTMENTS. RENT. DOCUMENTS.",
      ),
  );
}
const stories = [
  {
    a: ["Still looking for", "that property", "document?"],
    sub: ["Bring the details together."],
    dark: true,
  },
  {
    a: ["Land. Apartments.", "Rent. Documents."],
    sub: ["One place to organise", "your property records."],
    dark: false,
  },
  {
    a: ["Your property,", "in order."],
    sub: ["Free to use.", "No card or subscription."],
    dark: true,
  },
];
for (let i = 0; i < stories.length; i++) {
  const { a, sub, dark } = stories[i];
  await save(
    `stories/0${i + 1}`,
    1080,
    1920,
    `<rect width="1080" height="1920" fill="${dark ? C.forest : C.paper}"/>` +
      brand(dark) +
      text(
        80,
        390,
        "A LITTLE LESS PROPERTY ADMIN",
        20,
        dark ? C.lime : C.muted,
        600,
      ) +
      lines(80, 550, a, 74, dark ? C.paper : C.ink, 600, 1.2) +
      lines(80, 950, sub, 30, dark ? "#C5D9CC" : C.muted, 400, 1.55) +
      parcel(600, 1130, 1, dark) +
      (i === 2
        ? button(80, 1530, "Get started free", true)
        : text(
            80,
            1590,
            i === 0 ? "A clearer way is here." : "Built for Bangladesh.",
            29,
            dark ? C.lime : C.ink,
            600,
          )),
  );
}
const reel = [
  {
    title: ["Property admin", "taking over?"],
    sub: ["Scattered notes. Missing papers.", "Rent dates to remember."],
    dark: true,
  },
  {
    title: ["Bring it", "together."],
    sub: ["Land. Apartments.", "Documents. Rent records."],
    dark: false,
  },
  {
    title: ["A little less", "keeping track."],
    sub: ["A clearer view of the", "properties you manage."],
    dark: false,
  },
  {
    title: ["Your property,", "in order."],
    sub: ["Landlord. Free to use.", "Get started from your profile link."],
    dark: true,
  },
];
for (let i = 0; i < reel.length; i++) {
  const { title, sub, dark } = reel[i];
  await save(
    `reel-scenes/0${i + 1}`,
    1080,
    1920,
    `<rect width="1080" height="1920" fill="${dark ? C.forest : C.paper}"/>` +
      brand(dark) +
      text(
        80,
        370,
        `LESS ADMIN. MORE CLARITY.   0${i + 1}`,
        20,
        dark ? C.lime : C.muted,
        600,
      ) +
      lines(80, 555, title, 80, dark ? C.paper : C.ink, 600, 1.2) +
      lines(80, 910, sub, 29, dark ? "#C5D9CC" : C.muted, 400, 1.6) +
      parcel(560, 1150, 1.1, dark) +
      (i === 3 ? button(80, 1530, "Get started free", true) : "") +
      text(80, 1700, "BUILT FOR BANGLADESH", 20, dark ? "#C5D9CC" : C.muted),
  );
}
await save(
  "web/social-preview",
  1200,
  630,
  `<rect width="1200" height="630" fill="${C.forest}"/>` +
    mark(70, 60, 64) +
    text(154, 107, "landlord.", 40, C.paper, 700) +
    lines(70, 270, ["Your property,", "in order."], 82, C.paper, 600, 1.17) +
    text(70, 530, "Land. Apartments. Rent. Documents.", 25, "#C5D9CC") +
    parcel(825, 208, 0.85, true),
);
await fs.copyFile(
  path.join(out, "web/social-preview.png"),
  "app/opengraph-image.png",
);
await fs.copyFile(
  path.join(out, "web/social-preview.png"),
  "app/twitter-image.png",
);
await fs.writeFile(
  "app/opengraph-image.alt.txt",
  "Landlord — Your property, in order. Land, apartments, rent, and documents.",
);
await fs.writeFile(
  "app/twitter-image.alt.txt",
  "Landlord — Your property, in order. Land, apartments, rent, and documents.",
);

// ---------------------------------------------------------------------------
// Facebook page kit: profile picture, cover photos and the 10-post launch set.
// Captions, alt text and the posting schedule live in brand/FACEBOOK-POSTS.md.
// ---------------------------------------------------------------------------
const fb = (name) => `facebook/${name}`;
const soft = (dark) => (dark ? "#C5D9CC" : C.muted);
const card = (x, y, w, h, dark = false) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${dark ? "#1E5A4B" : "#fff"}" stroke="${dark ? "#3C6F5D" : C.line}" stroke-width="2"/>`;
// Text status chip. Status always carries a word, never colour alone.
// Bengali glyph clusters span several code units; narrow the estimate.
const chipWidth = (label) =>
  40 + label.length * (/[\u0980-\u09FF]/.test(label) ? 11 : 15);
const chip = (x, y, label, tone = "ok") => {
  const [bg, fg] =
    tone === "ok" ? ["#EAF1DD", C.forest] : ["#FBE7D3", "#A4510F"];
  const w = chipWidth(label);
  return `<rect x="${x}" y="${y}" width="${w}" height="56" rx="28" fill="${bg}"/>${text(x + 20, y + 38, label, 24, fg, 600)}`;
};
const mapCard = (x, y, label, dark = false) =>
  card(x, y, 560, 400, dark) +
  `<g stroke="${dark ? "#2F6857" : "#EDF2E8"}" stroke-width="2">${[1, 2, 3, 4, 5, 6].map((i) => `<path d="M${x + i * 80} ${y + 2}v330"/>`).join("")}${[1, 2, 3].map((i) => `<path d="M${x + 2} ${y + i * 82}h556"/>`).join("")}</g>` +
  `<path d="M${x + 120} ${y + 90} ${x + 380} ${y + 55} ${x + 440} ${y + 250} ${x + 160} ${y + 290}Z" fill="${dark ? "#376F55" : "#DDEBC8"}" stroke="${dark ? C.lime : C.forest}" stroke-width="6" stroke-linejoin="round"/>` +
  `<g fill="${C.lime}" stroke="${C.forest}" stroke-width="5">${[
    [120, 90],
    [380, 55],
    [440, 250],
    [160, 290],
  ]
    .map(([a, b]) => `<circle cx="${x + a}" cy="${y + b}" r="13"/>`)
    .join("")}</g>` +
  `<path d="M${x + 2} ${y + 330}h556v46a22 22 0 0 1-22 22H${x + 24}a22 22 0 0 1-22-22Z" fill="${dark ? "#174D40" : "#F3F6EE"}"/>` +
  text(x + 32, y + 376, label, 24, dark ? C.paper : C.ink, 600);
const docCard = (x, y, title, sub, note, dark = false, w = 920) =>
  card(x, y, w, 270, dark) +
  `<path d="M${x + 50} ${y + 55}h80v110h-80Z" fill="#EAF1DD" stroke="${C.sage}" stroke-width="2"/><path d="M${x + 68} ${y + 88}h44m-44 20h44m-44 20h28" stroke="${C.forest}" stroke-width="3"/>` +
  text(x + 170, y + 95, title, 31, dark ? C.paper : C.ink, 600) +
  text(x + 170, y + 145, sub, 25, soft(dark)) +
  text(x + 50, y + 225, note, 25, soft(dark));
const rentCard = (x, y, kicker, amount, label, chipLabel, dark = false) =>
  card(x, y, 920, 280, dark) +
  text(x + 40, y + 62, kicker, 20, soft(dark)) +
  text(x + 40, y + 148, amount, 72, dark ? C.paper : C.ink, 600) +
  text(x + 40, y + 228, label, 26, soft(dark)) +
  chip(x + 840 - chipWidth(chipLabel), y + 110, chipLabel);
const rows = (x, y, items, dark = false) =>
  items
    .map(
      ([name, status, tone], i) =>
        card(x, y + i * 120, 920, 100, dark) +
        text(x + 36, y + i * 120 + 62, name, 28, dark ? C.paper : C.ink, 600) +
        chip(x + 880 - chipWidth(status), y + i * 120 + 22, status, tone),
    )
    .join("");

// Profile picture: 720 × 720, symbol inside the circular crop.
await save(
  fb("profile-picture"),
  720,
  720,
  `<rect width="720" height="720" fill="${C.forest}"/>` + mark(150, 150, 420),
);
// Cover photo: 1640 × 624. Key content stays inside the centre 1100 × 460
// so it survives the mobile crop and the profile-picture overlap.
const cover = (headline, sub, kicker) =>
  `<rect width="1640" height="624" fill="${C.forest}"/>` +
  `<path d="M0 560 1640 470V624H0Z" fill="#123F35"/>` +
  mark(300, 110, 60) +
  wordmark(378, 156, 42, true) +
  text(300, 248, kicker, 22, C.lime, 600) +
  lines(300, 340, headline, 72, C.paper, 600, 1.15) +
  text(300, 508, sub, 28, "#C5D9CC");
await save(
  fb("cover-photo"),
  1640,
  624,
  cover(
    ["Your property,", "in order."],
    "Land · Apartments · Rent · Documents  —  landlordsbd.com",
    "FREE PROPERTY WORKSPACE · BUILT FOR BANGLADESH",
  ) + parcel(1040, 150, 0.95, true),
);
await save(
  fb("cover-photo-bn"),
  1640,
  624,
  cover(
    ["আপনার সম্পত্তি,", "গুছিয়ে রাখুন।"],
    "জমি · অ্যাপার্টমেন্ট · ভাড়া · কাগজপত্র  —  landlordsbd.com",
    "বাংলাদেশের জন্য তৈরি · ফ্রিতে ব্যবহার করুন",
  ) + parcel(1040, 150, 0.95, true),
);

// 01 · Launch post (EN)
await save(
  fb("posts/01-launch"),
  1080,
  1350,
  `<rect width="1080" height="1350" fill="${C.forest}"/>` +
    brand(true) +
    text(80, 304, "MEET LANDLORD", 22, C.lime, 600) +
    lines(80, 440, ["Your property,", "in order."], 88, C.paper, 600, 1.18) +
    lines(
      80,
      690,
      [
        "Land, apartments, rent records and",
        "documents, together in one place.",
      ],
      30,
      "#C5D9CC",
      400,
      1.5,
    ) +
    parcel(620, 790, 1.05, true) +
    button(80, 1040, "Get started free", true) +
    footer(1350, true, "LANDLORDSBD.COM · FREE TO USE"),
);
// 02 · Launch post (BN)
await save(
  fb("posts/02-launch-bn"),
  1080,
  1350,
  `<rect width="1080" height="1350" fill="${C.forest}"/>` +
    brand(true) +
    text(80, 310, "পরিচিত হোন Landlord-এর সাথে", 32, C.lime, 600) +
    lines(
      80,
      470,
      ["আপনার সম্পত্তি,", "গুছিয়ে রাখুন।"],
      76,
      C.paper,
      600,
      1.3,
    ) +
    lines(
      80,
      740,
      ["জমি, অ্যাপার্টমেন্ট, ভাড়ার হিসাব ও কাগজপত্র —", "সব এক জায়গায়।"],
      31,
      "#C5D9CC",
      400,
      1.55,
    ) +
    parcel(640, 830, 0.95, true) +
    button(80, 1040, "ফ্রিতে শুরু করুন", true) +
    footer(1350, true, "LANDLORDSBD.COM · ফ্রিতে ব্যবহার করুন"),
);
// 03 and 04 are text-only posts: copy only, see FACEBOOK-POSTS.md.

// 05 · Carousel: get started in three steps (EN)
const steps = [
  {
    dark: true,
    kicker: "GET STARTED IN 3 STEPS",
    title: ["Three steps to", "a tidier record."],
    sub: ["Swipe to see how to set up", "your first property."],
    art: parcel(600, 830, 1.05, true),
  },
  {
    kicker: "STEP 01",
    title: ["Add a plot or", "apartment."],
    sub: ["Draw the boundary on the map", "and keep location details with it."],
    art: mapCard(260, 775, "Plot boundary · saved"),
  },
  {
    kicker: "STEP 02",
    title: ["Attach your", "property papers."],
    sub: [
      "Deeds and ownership PDFs sit",
      "next to the property they belong to.",
    ],
    art: docCard(
      80,
      860,
      "Deed & ownership records",
      "PDFs, together in one place.",
      "Optional encryption before upload.",
    ),
  },
  {
    dark: true,
    kicker: "STEP 03",
    title: ["Record rent as", "it comes in."],
    sub: ["See each tenant's recorded rent", "month by month."],
    art:
      rows(
        80,
        790,
        [
          ["Flat 2A · October", "Recorded"],
          ["Flat 3B · October", "Due", "due"],
        ],
        true,
      ) + button(80, 1060, "Get started free", true),
  },
];
for (let i = 0; i < steps.length; i++) {
  const s = steps[i];
  await save(
    fb(`posts/05-carousel/0${i + 1}`),
    1080,
    1350,
    `<rect width="1080" height="1350" fill="${s.dark ? C.forest : C.paper}"/>` +
      brand(s.dark) +
      text(
        80,
        305,
        `${s.kicker}     ${i + 1} / 4`,
        22,
        s.dark ? C.lime : C.muted,
        600,
      ) +
      lines(80, 450, s.title, 78, s.dark ? C.paper : C.ink, 600, 1.18) +
      lines(80, 700, s.sub, 30, soft(s.dark), 400, 1.5) +
      s.art +
      footer(1350, s.dark, i < 3 ? "SWIPE →" : "LANDLORDSBD.COM · FREE TO USE"),
  );
}

// Vertical (1080 × 1920) scene. Facebook overlays the bottom ~320 px and the
// right edge of reels and stories, so content stays above y = 1600.
const vertical = (s, tag) =>
  `<rect width="1080" height="1920" fill="${s.dark ? C.forest : C.paper}"/>` +
  brand(s.dark) +
  text(80, 370, tag, 22, s.dark ? C.lime : C.muted, 600) +
  lines(80, 540, s.title, s.size || 80, s.dark ? C.paper : C.ink, 600, 1.2) +
  lines(
    80,
    540 + s.title.length * (s.size || 80) * 1.2 + 40,
    s.sub,
    32,
    soft(s.dark),
    400,
    1.5,
  ) +
  (s.art || "");
const timing = (scenes, D, T) =>
  scenes.map((s, i) => [
    i * (D - T),
    i === scenes.length - 1
      ? scenes.length * D - (scenes.length - 1) * T
      : (i + 1) * (D - T),
    s.caption,
  ]);
const stamp = (t, sep) => {
  const ms = Math.round(t * 1000);
  const p = (n, l = 2) => String(n).padStart(l, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
};
async function captions(dir, lang, cues) {
  await fs.writeFile(
    path.join(out, dir, `captions-${lang}.srt`),
    cues
      .map(
        ([a, b, c], i) =>
          `${i + 1}\n${stamp(a, ",")} --> ${stamp(b, ",")}\n${c}\n`,
      )
      .join("\n"),
  );
  await fs.writeFile(
    path.join(out, dir, `captions-${lang}.vtt`),
    "WEBVTT\n\n" +
      cues
        .map(([a, b, c]) => `${stamp(a, ".")} --> ${stamp(b, ".")}\n${c}\n`)
        .join("\n"),
  );
}
const videos = [];
async function scenesVideo(dir, file, lang, scenes, w, h, D, T, draw) {
  for (let i = 0; i < scenes.length; i++)
    await save(`${dir}/scene-0${i + 1}`, w, h, draw(scenes[i], i));
  await captions(dir, lang, timing(scenes, D, T));
  videos.push({ dir, file, count: scenes.length, w, h, D, T });
}

// 06 · Reel (EN): scattered records → one place. 5 scenes, ~15 s.
const reelEn = [
  {
    dark: true,
    title: ["The deed is in", "one drawer."],
    sub: ["The plot map is on", "someone's phone."],
    caption: "The deed is in one drawer. The plot map is on someone's phone.",
    art: parcel(560, 1150, 1.1, true),
  },
  {
    title: ["Rent is in a", "notebook."],
    sub: ["And the receipts?", "Somewhere."],
    caption: "Rent is in a notebook. And the receipts? Somewhere.",
    art: rows(80, 1130, [
      ["Flat 2A · October", "Recorded"],
      ["Flat 3B · October", "Due", "due"],
      ["Shop 1 · October", "Due", "due"],
    ]),
  },
  {
    title: ["Bring it", "together."],
    sub: ["One place for the details", "you keep looking for."],
    caption:
      "Bring it together. One place for the details you keep looking for.",
    art: mapCard(260, 1120, "Plot boundary · saved"),
  },
  {
    title: ["Plots. Flats.", "Rent. Papers."],
    sub: ["Each property with its", "own records."],
    caption: "Plots. Flats. Rent. Papers. Each property with its own records.",
    art: docCard(
      80,
      1150,
      "Deed & ownership records",
      "PDFs, together in one place.",
      "Optional encryption before upload.",
    ),
  },
  {
    dark: true,
    title: ["Your property,", "in order."],
    sub: ["Landlord is free to use.", "landlordsbd.com"],
    caption:
      "Your property, in order. Landlord is free to use. landlordsbd.com",
    art:
      parcel(560, 1150, 1.1, true) + button(80, 1430, "Get started free", true),
  },
];
await scenesVideo(
  fb("posts/06-reel"),
  "06-reel-property-admin.mp4",
  "en",
  reelEn,
  1080,
  1920,
  3.4,
  0.4,
  (s, i) => vertical(s, `A LITTLE LESS PROPERTY ADMIN   0${i + 1}`),
);

// 07 · Reel (BN): rent day. 5 scenes, ~15 s. Figures are illustrative.
const reelBn = [
  {
    dark: true,
    size: 72,
    title: ["ভাড়ার দিন এলেই", "খাতা খোঁজা?"],
    sub: ["কে দিয়েছেন, কে বাকি —", "মনে রাখা কঠিন।"],
    caption:
      "ভাড়ার দিন এলেই খাতা খোঁজা? কে দিয়েছেন, কে বাকি — মনে রাখা কঠিন।",
    art: parcel(560, 1180, 1.1, true),
  },
  {
    size: 72,
    title: ["ভাড়াটিয়ার তথ্য ও", "ভাড়ার হিসাব একসাথে।"],
    sub: ["প্রতিটি ফ্ল্যাট, প্রতিটি মাস।"],
    caption:
      "ভাড়াটিয়ার তথ্য ও ভাড়ার হিসাব একসাথে। প্রতিটি ফ্ল্যাট, প্রতিটি মাস।",
    art: rentCard(
      80,
      1110,
      "এই মাস · উদাহরণ মাত্র",
      "৳২৫,০০০",
      "রেকর্ড করা ভাড়া",
      "রেকর্ডকৃত",
    ),
  },
  {
    size: 72,
    title: ["প্রতি মাসের রেকর্ড", "এক নজরে।"],
    sub: ["লেখা থাকে কোনটি রেকর্ড হয়েছে,", "কোনটি বাকি।"],
    caption:
      "প্রতি মাসের রেকর্ড এক নজরে। লেখা থাকে কোনটি রেকর্ড হয়েছে, কোনটি বাকি।",
    art: rows(80, 1110, [
      ["নভেম্বর", "বাকি", "due"],
      ["অক্টোবর", "রেকর্ডকৃত"],
      ["সেপ্টেম্বর", "রেকর্ডকৃত"],
    ]),
  },
  {
    size: 72,
    title: ["জমি আর কাগজপত্রও", "একই জায়গায়।"],
    sub: ["সম্পত্তির সব তথ্য গুছিয়ে।"],
    caption: "জমি আর কাগজপত্রও একই জায়গায়। সম্পত্তির সব তথ্য গুছিয়ে।",
    art: mapCard(260, 1110, "জমির সীমানা · সংরক্ষিত"),
  },
  {
    dark: true,
    size: 72,
    title: ["আপনার সম্পত্তি,", "গুছিয়ে রাখুন।"],
    sub: ["Landlord ফ্রিতে ব্যবহার করুন।", "landlordsbd.com"],
    caption:
      "আপনার সম্পত্তি, গুছিয়ে রাখুন। Landlord ফ্রিতে ব্যবহার করুন। landlordsbd.com",
    art:
      parcel(560, 1180, 1.1, true) + button(80, 1430, "ফ্রিতে শুরু করুন", true),
  },
];
await scenesVideo(
  fb("posts/07-reel-bn"),
  "07-reel-rent-bn.mp4",
  "bn",
  reelBn,
  1080,
  1920,
  3.4,
  0.4,
  (s, i) => vertical(s, `ভাড়ার হিসাব, সহজে   0${i + 1}`),
);

// 08 · Story (3 frames). Frame 1 leaves y 1000–1450 open for a poll sticker,
// frame 3 leaves the same area for a link sticker.
const story = [
  {
    dark: true,
    size: 76,
    title: ["সম্পত্তির কাগজ", "কোথায় রাখেন?"],
    sub: ["ফাইলে, ফোনে, নাকি", "আত্মীয়ের কাছে?"],
    caption: "সম্পত্তির কাগজ কোথায় রাখেন?",
    art: text(80, 1560, "উত্তর দিন ↑", 32, C.lime, 600),
  },
  {
    title: ["Land. Apartments.", "Rent. Documents."],
    sub: ["One place for all four,", "organised by property."],
    caption: "Land. Apartments. Rent. Documents. One place for all four.",
    art: mapCard(260, 1060, "Plot boundary · saved"),
  },
  {
    dark: true,
    size: 76,
    title: ["আপনার সম্পত্তি,", "গুছিয়ে রাখুন।"],
    sub: ["Free to use · ফ্রিতে ব্যবহার করুন"],
    caption: "আপনার সম্পত্তি, গুছিয়ে রাখুন। Free to use.",
    art: text(80, 1560, "landlordsbd.com", 34, C.lime, 600),
  },
];
await scenesVideo(
  fb("posts/08-story"),
  "08-story.mp4",
  "bn",
  story,
  1080,
  1920,
  5,
  0.4,
  (s) => vertical(s, "LANDLORD · STORY"),
);

// 09 · Feed video (1080 × 1080, ~30 s): how it works.
const howItWorks = [
  {
    dark: true,
    kicker: "HOW LANDLORD WORKS",
    title: ["Your property,", "in 30 seconds."],
    sub: ["Four things, one place."],
    caption: "How Landlord works: your property, in 30 seconds.",
    art: parcel(640, 640, 0.95, true),
  },
  {
    kicker: "01 · PLOTS",
    title: ["Draw your plot", "on the map."],
    sub: ["The boundary is saved with the plot."],
    caption:
      "01. Draw your plot on the map. The boundary is saved with the plot.",
    art: mapCard(440, 640, "Plot boundary · saved"),
  },
  {
    kicker: "02 · APARTMENTS",
    title: ["Add apartments", "and tenants."],
    sub: ["Keep tenant details with each unit."],
    caption:
      "02. Add apartments and tenants. Keep tenant details with each unit.",
    art: rows(80, 640, [
      ["Flat 2A · Rahman", "Leased"],
      ["Flat 3B · Vacant", "Vacant", "due"],
      ["Shop 1 · Akter", "Leased"],
    ]),
  },
  {
    kicker: "03 · RENT",
    title: ["Record rent", "each month."],
    sub: ["See what is recorded and what is due."],
    caption:
      "03. Record rent each month. See what is recorded and what is due.",
    art: rentCard(
      80,
      680,
      "THIS MONTH · ILLUSTRATIVE EXAMPLE",
      "৳48,000",
      "Recorded rent",
      "Recorded",
    ),
  },
  {
    kicker: "04 · DOCUMENTS",
    title: ["Keep papers", "together."],
    sub: ["Deeds and records as PDFs."],
    caption:
      "04. Keep papers together. Deeds and records as PDFs, with optional encryption before upload.",
    art: docCard(
      80,
      680,
      "Deed & ownership records",
      "PDFs, together in one place.",
      "Optional encryption before upload.",
    ),
  },
  {
    dark: true,
    kicker: "FREE TO USE",
    title: ["Your property,", "in order."],
    sub: ["Start with one property.", "landlordsbd.com"],
    caption:
      "Your property, in order. Start with one property at landlordsbd.com.",
    art: button(80, 850, "Get started free", true),
  },
];
await scenesVideo(
  fb("posts/09-video"),
  "09-video-how-it-works.mp4",
  "en",
  howItWorks,
  1080,
  1080,
  5.4,
  0.4,
  (s) =>
    `<rect width="1080" height="1080" fill="${s.dark ? C.forest : C.paper}"/>` +
    brand(s.dark) +
    text(80, 280, s.kicker, 22, s.dark ? C.lime : C.muted, 600) +
    lines(80, 390, s.title, 72, s.dark ? C.paper : C.ink, 600, 1.15) +
    text(80, 580, s.sub[0], 30, soft(s.dark)) +
    (s.sub[1] ? text(80, 625, s.sub[1], 30, soft(s.dark)) : "") +
    s.art,
);

// 10 · Documents post (BN)
await save(
  fb("posts/10-documents-bn"),
  1080,
  1350,
  `<rect width="1080" height="1350" fill="${C.paper}"/>` +
    brand() +
    text(80, 305, "কাগজপত্র থাকুক হাতের কাছে", 32, C.forest, 600) +
    lines(
      80,
      450,
      ["দলিল, খতিয়ান,", "রসিদ — এক জায়গায়।"],
      72,
      C.ink,
      600,
      1.3,
    ) +
    lines(
      80,
      690,
      ["প্রতিটি সম্পত্তির PDF কাগজপত্র", "সেই সম্পত্তির সাথেই রাখুন।"],
      31,
      C.muted,
      400,
      1.55,
    ) +
    docCard(
      80,
      860,
      "দলিল ও মালিকানার কাগজ",
      "PDF ফাইল, এক জায়গায়।",
      "চাইলে আপলোডের আগে এনক্রিপ্ট করুন।",
    ) +
    footer(1350, false, "এনক্রিপশন পাসফ্রেজটি নিরাপদে সংরক্ষণ করুন"),
);

// Render the Facebook videos: gentle push-in per scene, crossfades, silent
// H.264 at 30 fps (Facebook autoplays muted; text is burned in and captions
// are provided as SRT/VTT).
let ffmpeg = true;
try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  ffmpeg = false;
  console.warn("ffmpeg not found: skipped rendering Facebook videos.");
}
for (const v of ffmpeg ? videos : []) {
  const args = ["-hide_banner", "-loglevel", "error", "-y"];
  const chains = [];
  for (let i = 0; i < v.count; i++) {
    args.push("-loop", "1", "-framerate", "30", "-t", String(v.D));
    args.push("-i", path.join(out, v.dir, `scene-0${i + 1}.png`));
    chains.push(
      `[${i}:v]scale=${v.w * 2}:${v.h * 2},zoompan=z='1+0.0004*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=${v.w}x${v.h}:fps=30,setsar=1[s${i}]`,
    );
  }
  let last = "s0";
  for (let i = 1; i < v.count; i++) {
    chains.push(
      `[${last}][s${i}]xfade=transition=fade:duration=${v.T}:offset=${(i * (v.D - v.T)).toFixed(2)}[x${i}]`,
    );
    last = `x${i}`;
  }
  chains.push(`[${last}]format=yuv420p[v]`);
  args.push("-filter_complex", chains.join(";"), "-map", "[v]");
  args.push("-c:v", "libx264", "-preset", "medium", "-crf", "22");
  args.push(
    "-movflags",
    "+faststart",
    path.join(out, "facebook/posts", v.file),
  );
  execFileSync("ffmpeg", args, { stdio: "inherit" });
}
console.log(`Brand kit generated at ${out}`);
