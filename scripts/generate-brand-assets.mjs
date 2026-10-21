import fs from "node:fs/promises";
import path from "node:path";
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
const markInner = `<rect width="64" height="64" rx="17" fill="${C.forest}"/><path d="M17 23 43 16 49 42 23 49Z" fill="none" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><path d="M28 25v13h11" fill="none" stroke="${C.lime}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><g fill="${C.lime}"><circle cx="17" cy="23" r="3"/><circle cx="43" cy="16" r="3"/><circle cx="49" cy="42" r="3"/><circle cx="23" cy="49" r="3"/></g>`;
const svg = (w, h, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const mark = (x, y, size = 64) =>
  `<g transform="translate(${x} ${y}) scale(${size / 64})">${markInner}</g>`;
const text = (x, y, str, size = 28, color = C.ink, weight = 400, extra = "") =>
  `<text x="${x}" y="${y}" font-family="'DejaVu Sans', 'Noto Sans Bengali', sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}" ${extra}>${esc(str)}</text>`;
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
  mark(80, 100, 65) +
  text(163, 149, "landlord.", 44, dark ? C.paper : C.ink, 700);
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
await save(
  "logos/landlord-wordmark",
  640,
  150,
  mark(10, 15, 120) + text(158, 105, "landlord.", 76, C.ink, 700),
);
await save(
  "logos/landlord-wordmark-reversed",
  640,
  150,
  `<rect width="640" height="150" fill="${C.forest}"/>` +
    mark(10, 15, 120) +
    text(158, 105, "landlord.", 76, C.paper, 700),
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
const icoPng = await sharp(Buffer.from(icon)).resize(32).png().toBuffer();
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico[6] = 32;
ico[7] = 32;
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(icoPng.length, 14);
ico.writeUInt32LE(22, 18);
await fs.writeFile("app/favicon.ico", Buffer.concat([ico, icoPng]));

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
console.log(`Brand kit generated at ${out}`);
