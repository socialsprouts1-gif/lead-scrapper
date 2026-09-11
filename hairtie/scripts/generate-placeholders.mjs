/**
 * Generates the demo imagery that ships with the store.
 *
 * These are lightweight SVGs — soft tinted grounds with fine line-art — so the
 * demo catalogue looks considered rather than broken. Every one of them is
 * meant to be replaced from Admin → Media / Products once real Hairtie photos
 * are available.
 */
import { mkdirSync, rmSync } from "node:fs";
import sharp from "sharp";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public", "images");

const PALETTES = [
  ["#f6ece4", "#e8d5c8", "#a8836d"],
  ["#f7e9e9", "#eed4d2", "#b3827e"],
  ["#f1eee7", "#ded9cd", "#8e8778"],
  ["#f4eef4", "#e2d6e2", "#9a8399"],
  ["#eef1ee", "#d9e0d8", "#7f8c7d"],
  ["#faf0e6", "#f0dcc6", "#b28e63"],
  ["#f2eff5", "#dcd6e6", "#8d85a3"],
  ["#fbf1ec", "#f2ded2", "#bd917a"],
];

function ground(w, h, palette, seed = 0) {
  const [bg, mid, ink] = palette;
  return {
    ink,
    defs: `
  <defs>
    <linearGradient id="g${seed}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="${mid}"/>
    </linearGradient>
    <radialGradient id="r${seed}" cx="30%" cy="22%" r="72%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g${seed})"/>
  <rect width="${w}" height="${h}" fill="url(#r${seed})"/>`,
  };
}

/* --- line art, drawn in a 0..100 box and scaled into place --------------- */
const ART = {
  bow: `M50 50 C 34 30, 8 32, 10 50 C 8 68, 34 70, 50 50 Z
        M50 50 C 66 30, 92 32, 90 50 C 92 68, 66 70, 50 50 Z`,
  bowKnot: `M50 42 a 8 8 0 1 0 0.1 0 Z`,
  scrunchie: `M50 18 C 74 18, 88 33, 88 50 C 88 68, 74 82, 50 82 C 27 82, 12 68, 12 50 C 12 33, 27 18, 50 18 Z
              M50 33 C 62 33, 71 40, 71 50 C 71 60, 62 67, 50 67 C 38 67, 29 60, 29 50 C 29 40, 38 33, 50 33 Z`,
  clawclip: `M22 30 L 78 30 A 10 10 0 0 1 78 50 L 30 50 A 8 8 0 0 0 30 66 L 74 66
             M22 30 A 10 10 0 0 0 22 50 L 66 50 A 8 8 0 0 1 66 66 L 26 66`,
  hairband: `M14 72 A 40 40 0 0 1 86 72 M22 74 A 32 32 0 0 1 78 74`,
  clip: `M20 44 L 80 44 A 6 6 0 0 1 80 56 L 20 56 A 6 6 0 0 1 20 44 Z
         M32 44 L 32 56 M44 44 L 44 56 M56 44 L 56 56 M68 44 L 68 56`,
  tote: `M22 36 L 78 36 L 84 84 L 16 84 Z M36 36 C 36 20, 64 20, 64 36`,
  sling: `M26 44 L 74 44 L 74 78 L 26 78 Z M26 44 L 50 30 L 74 44 M20 44 C 10 26, 40 12, 50 30`,
  shoulder: `M20 46 C 20 40, 80 40, 80 46 L 84 82 L 16 82 Z M34 44 C 34 24, 66 24, 66 44`,
  clutch: `M16 44 L 84 44 L 84 74 L 16 74 Z M16 44 L 50 26 L 84 44 M42 58 L 58 58`,
  ring: `M50 20 a 30 30 0 1 0 0.1 0 Z M50 36 a 14 14 0 1 0 0.1 0 Z`,
};

function artPaths(kind, ink, cx, cy, size) {
  const list = ART[kind] ? [ART[kind]] : [ART.ring];
  if (kind === "bow") list.push(ART.bowKnot);
  const scale = size / 100;
  const tx = cx - size / 2;
  const ty = cy - size / 2;
  return `<g transform="translate(${tx} ${ty}) scale(${scale})" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.88">
    ${list.map((d) => `<path d="${d}"/>`).join("\n    ")}
  </g>`;
}

function productSvg(kind, paletteIndex, label) {
  const palette = PALETTES[paletteIndex % PALETTES.length];
  const { ink, defs } = ground(800, 1000, palette, paletteIndex);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img" aria-label="${label}">
  ${defs}
  <circle cx="400" cy="470" r="250" fill="#ffffff" opacity="0.5"/>
  <ellipse cx="400" cy="690" rx="150" ry="16" fill="#000000" opacity="0.06"/>
  ${artPaths(kind, ink, 400, 470, 340)}
  <path d="M250 760 h300" stroke="${ink}" stroke-width="1" opacity="0.25"/>
</svg>`;
}

function sceneSvg(w, h, paletteIndex, kinds, label) {
  const palette = PALETTES[paletteIndex % PALETTES.length];
  const { ink, defs } = ground(w, h, palette, 100 + paletteIndex);
  const items = kinds
    .map((kind, i) => {
      const cx = (w / (kinds.length + 1)) * (i + 1);
      const cy = h / 2 + (i % 2 === 0 ? -h * 0.04 : h * 0.05);
      return artPaths(kind, ink, cx, cy, Math.min(w / (kinds.length + 1), h) * 0.62);
    })
    .join("\n  ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
  ${defs}
  <circle cx="${w * 0.18}" cy="${h * 0.22}" r="${h * 0.3}" fill="#ffffff" opacity="0.3"/>
  <circle cx="${w * 0.82}" cy="${h * 0.78}" r="${h * 0.26}" fill="#ffffff" opacity="0.22"/>
  ${items}
</svg>`;
}

const files = [];

// Hero + banners + lifestyle
files.push(["hero/hero-main.svg", sceneSvg(1600, 1000, 1, ["bow", "tote", "scrunchie"], "Hairtie hair accessories and handbags")]);
files.push(["hero/hero-mobile.svg", sceneSvg(900, 1200, 1, ["bow", "tote"], "Hairtie accessories")]);
files.push(["banners/promo-wide.svg", sceneSvg(1600, 700, 5, ["clawclip", "sling"], "Hairtie promotional banner")]);
files.push(["banners/promo-secondary.svg", sceneSvg(1400, 700, 3, ["clutch", "ring"], "Hairtie collection banner")]);
files.push(["lifestyle/lifestyle-1.svg", sceneSvg(1000, 1100, 0, ["scrunchie", "bow"], "Hairtie styling")]);
files.push(["lifestyle/lifestyle-2.svg", sceneSvg(1000, 1100, 6, ["tote"], "Hairtie handbag styling")]);
files.push(["lifestyle/lifestyle-3.svg", sceneSvg(1000, 1100, 4, ["shoulder", "clip"], "Hairtie everyday styling")]);
files.push(["store/hairtie-store.svg", sceneSvg(1400, 900, 2, ["tote", "bow", "clutch"], "The Hairtie store")]);
files.push(["about/about-story.svg", sceneSvg(1200, 900, 7, ["bow", "ring"], "About Hairtie")]);

// Instagram grid
["bow", "tote", "scrunchie", "clawclip", "sling", "clutch"].forEach((kind, i) => {
  files.push([`instagram/ig-${i + 1}.svg`, sceneSvg(700, 700, i, [kind], `Hairtie on Instagram ${i + 1}`)]);
});

// Category cards
const CATEGORY_ART = {
  "hair-accessories": "bow",
  handbags: "tote",
  "claw-clips": "clawclip",
  scrunchies: "scrunchie",
  "hair-bows": "bow",
  "hair-bands": "hairband",
  "hair-clips": "clip",
  "sling-bags": "sling",
  "shoulder-bags": "shoulder",
  "tote-bags": "tote",
  clutches: "clutch",
  "other-accessories": "ring",
};
Object.entries(CATEGORY_ART).forEach(([slug, kind], i) => {
  files.push([`categories/${slug}.svg`, sceneSvg(800, 1000, i + 2, [kind], `${slug} category`)]);
});

// Product photography placeholders — three angles per art type
Object.values(CATEGORY_ART)
  .filter((v, i, a) => a.indexOf(v) === i)
  .forEach((kind) => {
    for (let angle = 1; angle <= 3; angle += 1) {
      for (let tone = 0; tone < 3; tone += 1) {
        files.push([
          `products/${kind}-${tone + 1}-${angle}.svg`,
          productSvg(kind, tone * 3 + angle, `${kind} product photo ${angle}`),
        ]);
      }
    }
  });

// Rasterised to WebP: Next.js refuses to run SVG through its image optimizer,
// and raster files also let us serve properly sized responsive images.
rmSync(ROOT, { recursive: true, force: true });
await Promise.all(
  files.map(async ([relative, contents]) => {
    const target = join(ROOT, relative.replace(/\.svg$/, ".webp"));
    mkdirSync(join(target, ".."), { recursive: true });
    await sharp(Buffer.from(contents.replace(/\n\s*\n/g, "\n")))
      .webp({ quality: 86, effort: 4 })
      .toFile(target);
  }),
);

console.log(`Generated ${files.length} placeholder images in public/images`);
