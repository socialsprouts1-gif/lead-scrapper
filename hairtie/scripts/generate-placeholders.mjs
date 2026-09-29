/**
 * Generates the demo imagery that ships with the store.
 *
 * These are rendered from SVG rather than photographed: a soft studio backdrop,
 * a pool of light, a cast shadow, and a solid, shaded illustration of the piece
 * itself. The point is that the demo catalogue should look considered — every
 * one of them is still meant to be replaced from Admin → Media / Products once
 * real Hairtie photographs exist.
 *
 *   node scripts/generate-placeholders.mjs
 */
import { mkdirSync, rmSync } from "node:fs";
import sharp from "sharp";
import { join } from "node:path";

const ROOT = join(process.cwd(), "public", "images");

/**
 * Each palette is a small studio: the wall behind, the surface underneath, and
 * the three tones the object itself is built from.
 */
const PALETTES = [
  { wallTop: "#f9f1ea", wallBottom: "#eddfd2", floor: "#e4d3c4", body: "#c39a7d", shade: "#a87e61", light: "#e8cdb6", ink: "#6b4f3c" },
  { wallTop: "#fbf0f0", wallBottom: "#f0dad8", floor: "#e8cdca", body: "#c98f8b", shade: "#ad7370", light: "#eec5c2", ink: "#6f4442" },
  { wallTop: "#f6f4ee", wallBottom: "#e5e1d6", floor: "#dad5c7", body: "#a49c88", shade: "#87806e", light: "#cfc9b8", ink: "#4f4a3e" },
  { wallTop: "#f7f2f8", wallBottom: "#e6dcea", floor: "#dccfe2", body: "#a892b4", shade: "#8b7597", light: "#d0bfd9", ink: "#4e4157" },
  { wallTop: "#f1f5f1", wallBottom: "#dde6dd", floor: "#d2ddd1", body: "#8fa38d", shade: "#728672", light: "#bfd0be", ink: "#3f4d3f" },
  { wallTop: "#fdf5eb", wallBottom: "#f4e2ca", floor: "#ecd6b8", body: "#c9a46d", shade: "#a98551", light: "#e7cfa4", ink: "#6a5130" },
  { wallTop: "#f3f2f8", wallBottom: "#dfdcec", floor: "#d4d0e4", body: "#9691b4", shade: "#787397", light: "#c3bfd9", ink: "#43405a" },
  { wallTop: "#fcf3ee", wallBottom: "#f4ded1", floor: "#ecd2c1", body: "#c9997b", shade: "#a97b5f", light: "#e7c4ac", ink: "#6a4832" },
];

const palette = (index) => PALETTES[((index % PALETTES.length) + PALETTES.length) % PALETTES.length];

/* -------------------------------------------------------------------------- */
/* The studio                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Wall, surface and a pool of light. `horizon` is where the wall meets the
 * surface, as a fraction of the height.
 */
function studio(w, h, p, seed, horizon = 0.74) {
  const y = h * horizon;
  return `
  <defs>
    <linearGradient id="wall${seed}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.wallTop}"/>
      <stop offset="100%" stop-color="${p.wallBottom}"/>
    </linearGradient>
    <linearGradient id="floor${seed}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.floor}"/>
      <stop offset="100%" stop-color="${p.wallBottom}"/>
    </linearGradient>
    <radialGradient id="pool${seed}" cx="50%" cy="40%" r="88%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.5"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette${seed}" cx="50%" cy="48%" r="72%">
      <stop offset="60%" stop-color="#000000" stop-opacity="0"/>
      <stop offset="100%" stop-color="${p.ink}" stop-opacity="0.13"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#wall${seed})"/>
  <rect y="${y}" width="${w}" height="${h - y}" fill="url(#floor${seed})"/>
  <rect y="${y - 1}" width="${w}" height="2" fill="#ffffff" opacity="0.4"/>
  <rect width="${w}" height="${h}" fill="url(#pool${seed})"/>`;
}

const vignette = (w, h, seed) => `<rect width="${w}" height="${h}" fill="url(#vignette${seed})"/>`;

/** A soft contact shadow, built from stacked ellipses so no blur filter is needed. */
function shadow(cx, cy, rx, ink) {
  return [0.1, 0.07, 0.05, 0.03]
    .map((opacity, i) => {
      const grow = 1 + i * 0.22;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx * grow}" ry="${rx * 0.15 * grow}" fill="${ink}" opacity="${opacity}"/>`;
    })
    .join("\n  ");
}

/* -------------------------------------------------------------------------- */
/* The pieces, drawn solid inside a 0..100 box                                 */
/* -------------------------------------------------------------------------- */

const ART = {
  bow: (p) => `
    <path d="M50 50 C 33 28, 6 30, 8 50 C 6 70, 33 72, 50 50 Z" fill="${p.body}"/>
    <path d="M50 50 C 67 28, 94 30, 92 50 C 94 70, 67 72, 50 50 Z" fill="${p.body}"/>
    <path d="M50 50 C 36 40, 18 40, 10 46 C 22 42, 38 45, 50 50 Z" fill="${p.light}" opacity="0.75"/>
    <path d="M50 50 C 64 40, 82 40, 90 46 C 78 42, 62 45, 50 50 Z" fill="${p.light}" opacity="0.75"/>
    <path d="M50 50 C 34 62, 16 62, 8 56 C 20 64, 36 62, 50 50 Z" fill="${p.shade}" opacity="0.6"/>
    <path d="M50 50 C 66 62, 84 62, 92 56 C 80 64, 64 62, 50 50 Z" fill="${p.shade}" opacity="0.6"/>
    <path d="M44 38 C 40 50, 40 56, 44 66 C 52 70, 56 68, 58 64 C 54 54, 54 46, 58 36 C 52 32, 47 33, 44 38 Z" fill="${p.shade}"/>
    <path d="M47 40 C 45 50, 45 56, 47 62" stroke="${p.light}" stroke-width="1.4" fill="none" opacity="0.6"/>`,

  scrunchie: (p) => `
    <path d="M50 14 C 76 14, 92 30, 92 50 C 92 70, 76 86, 50 86 C 24 86, 8 70, 8 50 C 8 30, 24 14, 50 14 Z
             M50 32 C 63 32, 72 40, 72 50 C 72 60, 63 68, 50 68 C 37 68, 28 60, 28 50 C 28 40, 37 32, 50 32 Z"
          fill="${p.body}" fill-rule="evenodd"/>
    <path d="M50 14 C 68 14, 82 24, 88 38 C 80 26, 66 20, 50 20 C 34 20, 20 26, 12 38 C 18 24, 32 14, 50 14 Z" fill="${p.light}" opacity="0.8"/>
    <path d="M12 62 C 20 76, 34 86, 50 86 C 66 86, 80 76, 88 62 C 82 78, 68 90, 50 90 C 32 90, 18 78, 12 62 Z" fill="${p.shade}" opacity="0.45"/>
    ${[18, 42, 66, 90, 114, 138, 162, 186, 210, 234, 258, 282, 306, 330]
      .map((a) => {
        const r1 = 22, r2 = 39;
        const rad = (a * Math.PI) / 180;
        return `<path d="M${(50 + r1 * Math.cos(rad)).toFixed(1)} ${(50 + r1 * Math.sin(rad)).toFixed(1)} L${(50 + r2 * Math.cos(rad)).toFixed(1)} ${(50 + r2 * Math.sin(rad)).toFixed(1)}" stroke="${p.shade}" stroke-width="1.6" opacity="0.5" stroke-linecap="round"/>`;
      })
      .join("\n    ")}`,

  clawclip: (p) => `
    <rect x="14" y="26" width="72" height="48" rx="18" fill="${p.body}"/>
    <path d="M50 26 H68 A18 18 0 0 1 86 44 V56 A18 18 0 0 1 68 74 H50 Z" fill="${p.shade}" opacity="0.55"/>
    <path d="M32 26 H68 A18 18 0 0 1 84 38 A16 16 0 0 0 70 32 H30 A16 16 0 0 0 16 38 A18 18 0 0 1 32 26 Z" fill="${p.light}" opacity="0.85"/>
    <path d="M50 26 C 46 38, 54 44, 50 50 C 46 56, 54 62, 50 74" fill="none" stroke="${p.shade}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    ${[34, 42, 58, 66]
      .map((x) => `<path d="M${x} 26 V33" stroke="${p.shade}" stroke-width="1.6" opacity="0.28" stroke-linecap="round"/><path d="M${x} 74 V67" stroke="${p.shade}" stroke-width="1.6" opacity="0.28" stroke-linecap="round"/>`)
      .join("\n    ")}
    <circle cx="24" cy="50" r="3.6" fill="${p.shade}" opacity="0.8"/>
    <circle cx="76" cy="50" r="3.6" fill="${p.light}" opacity="0.7"/>`,

  hairband: (p) => `
    <path d="M10 78 A40 40 0 0 1 90 78 L82 78 A32 32 0 0 0 18 78 Z" fill="${p.body}"/>
    <path d="M12 72 A38 38 0 0 1 88 72 A38 38 0 0 0 12 72 Z" fill="${p.light}" opacity="0.7"/>
    <path d="M18 78 A32 32 0 0 1 82 78 L78 78 A28 28 0 0 0 22 78 Z" fill="${p.shade}" opacity="0.5"/>
    <ellipse cx="50" cy="34" rx="9" ry="7" fill="${p.shade}"/>
    <ellipse cx="50" cy="33" rx="5" ry="3.6" fill="${p.light}" opacity="0.8"/>`,

  clip: (p) => `
    <rect x="10" y="38" width="80" height="24" rx="12" fill="${p.body}"/>
    <rect x="10" y="38" width="80" height="9" rx="4.5" fill="${p.light}" opacity="0.8"/>
    <rect x="10" y="54" width="80" height="8" rx="4" fill="${p.shade}" opacity="0.5"/>
    ${[26, 38, 50, 62, 74]
      .map((x) => `<path d="M${x} 41 L${x} 59" stroke="${p.shade}" stroke-width="2" opacity="0.5" stroke-linecap="round"/>`)
      .join("\n    ")}
    <circle cx="84" cy="50" r="4" fill="${p.shade}"/>
    <circle cx="84" cy="49" r="1.8" fill="${p.light}" opacity="0.8"/>`,

  tote: (p) => `
    <path d="M22 34 L78 34 L84 84 A4 4 0 0 1 80 88 L20 88 A4 4 0 0 1 16 84 Z" fill="${p.body}"/>
    <path d="M22 34 L78 34 L79 42 L21 42 Z" fill="${p.light}" opacity="0.8"/>
    <path d="M16 84 A4 4 0 0 0 20 88 L80 88 A4 4 0 0 0 84 84 L83 76 L17 76 Z" fill="${p.shade}" opacity="0.55"/>
    <path d="M34 34 C 34 18, 66 18, 66 34" fill="none" stroke="${p.shade}" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M35 33 C 35 20, 65 20, 65 33" fill="none" stroke="${p.light}" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>
    <rect x="44" y="56" width="12" height="9" rx="2" fill="${p.shade}"/>`,

  sling: (p) => `
    <path d="M26 44 L74 44 A4 4 0 0 1 78 48 L78 76 A4 4 0 0 1 74 80 L26 80 A4 4 0 0 1 22 76 L22 48 A4 4 0 0 1 26 44 Z" fill="${p.body}"/>
    <path d="M22 48 A4 4 0 0 1 26 44 L74 44 A4 4 0 0 1 78 48 L78 54 L22 54 Z" fill="${p.light}" opacity="0.75"/>
    <path d="M22 70 L78 70 L78 76 A4 4 0 0 1 74 80 L26 80 A4 4 0 0 1 22 76 Z" fill="${p.shade}" opacity="0.55"/>
    <path d="M26 44 L50 30 L74 44" fill="${p.shade}" opacity="0.85"/>
    <path d="M28 42 C 24 12, 76 12, 72 42" fill="none" stroke="${p.shade}" stroke-width="3.2" stroke-linecap="round"/>
    <rect x="45" y="50" width="10" height="7" rx="2" fill="${p.light}" opacity="0.9"/>`,

  shoulder: (p) => `
    <path d="M20 46 C 20 38, 80 38, 80 46 L85 82 A4 4 0 0 1 81 86 L19 86 A4 4 0 0 1 15 82 Z" fill="${p.body}"/>
    <path d="M20 46 C 20 38, 80 38, 80 46 L81 54 L19 54 Z" fill="${p.light}" opacity="0.75"/>
    <path d="M15 82 A4 4 0 0 0 19 86 L81 86 A4 4 0 0 0 85 82 L84 72 L16 72 Z" fill="${p.shade}" opacity="0.5"/>
    <path d="M32 42 C 32 22, 68 22, 68 42" fill="none" stroke="${p.shade}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="50" cy="63" r="4.5" fill="${p.shade}"/>`,

  clutch: (p) => `
    <path d="M16 46 L84 46 A3 3 0 0 1 87 49 L87 74 A3 3 0 0 1 84 77 L16 77 A3 3 0 0 1 13 74 L13 49 A3 3 0 0 1 16 46 Z" fill="${p.body}"/>
    <path d="M16 46 L84 46 L50 26 Z" fill="${p.shade}"/>
    <path d="M18 46 L82 46 L50 28 Z" fill="${p.light}" opacity="0.5"/>
    <path d="M13 68 L87 68 L87 74 A3 3 0 0 1 84 77 L16 77 A3 3 0 0 1 13 74 Z" fill="${p.shade}" opacity="0.5"/>
    <rect x="44" y="44" width="12" height="6" rx="3" fill="${p.light}"/>`,

  ring: (p) => `
    <circle cx="50" cy="52" r="32" fill="${p.body}"/>
    <circle cx="50" cy="52" r="17" fill="#ffffff" opacity="0.9"/>
    <path d="M50 20 A32 32 0 0 1 82 52 A32 32 0 0 0 50 26 A32 32 0 0 0 18 52 A32 32 0 0 1 50 20 Z" fill="${p.light}" opacity="0.8"/>
    <path d="M22 66 A32 32 0 0 0 78 66 A32 32 0 0 1 22 66 Z" fill="${p.shade}" opacity="0.55"/>
    <circle cx="50" cy="20" r="6" fill="${p.shade}"/>
    <circle cx="50" cy="19" r="2.6" fill="${p.light}"/>`,
};

/**
 * Where each piece's lowest point sits inside its own 0..100 box, and how wide
 * it is. The cast shadow is placed from these, so a flat hair clip does not
 * float the way a tall bag would if every piece shared one guess.
 */
const BASELINE = {
  bow: 70, scrunchie: 87, clawclip: 75, hairband: 79, clip: 63,
  tote: 89, sling: 81, shoulder: 87, clutch: 78, ring: 85,
};
const HALF_WIDTH = {
  bow: 42, scrunchie: 41, clawclip: 36, hairband: 40, clip: 40,
  tote: 34, sling: 28, shoulder: 35, clutch: 37, ring: 32,
};

/**
 * Places a piece at (cx, cy), optionally rotated. Returns the shadow, the
 * artwork, and where the piece meets the surface, so the caller can lay them
 * down in order and put the horizon in the right place.
 */
function piece(kind, p, cx, cy, size, rotate = 0) {
  const draw = ART[kind] ?? ART.ring;
  const scale = size / 100;
  const groundY = cy + ((BASELINE[kind] ?? 82) - 50) * scale + size * 0.02;

  return {
    groundY,
    shadow: shadow(cx, groundY, (HALF_WIDTH[kind] ?? 34) * scale * 0.9, p.ink),
    art: `<g transform="translate(${cx} ${cy}) rotate(${rotate}) scale(${scale}) translate(-50 -50)">
    ${draw(p)}
  </g>`,
  };
}

/* -------------------------------------------------------------------------- */
/* Shots                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A product shot. `angle` 1 is the straight-on pack shot, 2 is a three-quarter
 * turn, and 3 is a close crop — so a product's three photos differ the way real
 * ones would.
 */
function productSvg(kind, paletteIndex, angle, label) {
  const p = palette(paletteIndex);
  const w = 800;
  const h = 1000;
  const seed = `p${paletteIndex}${angle}`;

  const layout =
    angle === 2
      ? { cx: 400, cy: 470, size: 470, rotate: -9 }
      : angle === 3
        ? { cx: 430, cy: 500, size: 760, rotate: 6 }
        : { cx: 400, cy: 455, size: 520, rotate: 0 };

  const placed = piece(kind, p, layout.cx, layout.cy, layout.size, layout.rotate);
  const { shadow: cast, art } = placed;
  // The surface meets the wall just above the cast shadow, so the piece reads
  // as standing on something rather than floating.
  const horizon = (placed.groundY - layout.size * 0.05) / h;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
  ${studio(w, h, p, seed, horizon)}
  ${cast}
  ${art}
  ${vignette(w, h, seed)}
</svg>`;
}

/** A wider scene with several pieces — used for banners, categories and lifestyle shots. */
function sceneSvg(w, h, paletteIndex, kinds, label) {
  const p = palette(paletteIndex);
  const seed = `s${paletteIndex}${w}${h}`;
  const slot = w / (kinds.length + 1);
  const size = Math.min(slot * 1.15, h * 0.52);

  const placed = kinds.map((kind, i) => {
    const cx = slot * (i + 1);
    const cy = h * 0.46 + (i % 2 === 0 ? -h * 0.03 : h * 0.03);
    return piece(kind, p, cx, cy, size * (i % 2 === 0 ? 1 : 0.86), i % 2 === 0 ? -5 : 7);
  });
  const horizon = Math.min(...placed.map((item) => item.groundY / h - 0.03));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">
  ${studio(w, h, p, seed, horizon)}
  <circle cx="${w * 0.18}" cy="${h * 0.24}" r="${h * 0.26}" fill="#ffffff" opacity="0.22"/>
  <circle cx="${w * 0.84}" cy="${h * 0.7}" r="${h * 0.2}" fill="${p.light}" opacity="0.28"/>
  ${placed.map((item) => item.shadow).join("\n  ")}
  ${placed.map((item) => item.art).join("\n  ")}
  ${vignette(w, h, seed)}
</svg>`;
}

/* -------------------------------------------------------------------------- */

const files = [];

files.push(["hero/hero-main.svg", sceneSvg(1600, 1000, 1, ["bow", "tote", "scrunchie"], "Hairtie hair accessories and handbags")]);
files.push(["hero/hero-mobile.svg", sceneSvg(900, 1200, 1, ["bow", "tote"], "Hairtie accessories")]);
files.push(["banners/promo-wide.svg", sceneSvg(1600, 700, 5, ["clawclip", "sling"], "Hairtie promotional banner")]);
files.push(["banners/promo-secondary.svg", sceneSvg(1400, 700, 3, ["clutch", "ring"], "Hairtie collection banner")]);
files.push(["lifestyle/lifestyle-1.svg", sceneSvg(1000, 1100, 0, ["scrunchie", "bow"], "Hairtie styling")]);
files.push(["lifestyle/lifestyle-2.svg", sceneSvg(1000, 1100, 6, ["tote"], "Hairtie handbag styling")]);
files.push(["lifestyle/lifestyle-3.svg", sceneSvg(1000, 1100, 4, ["shoulder", "clip"], "Hairtie everyday styling")]);
files.push(["store/hairtie-store.svg", sceneSvg(1400, 900, 2, ["tote", "bow", "clutch"], "The Hairtie store")]);
files.push(["about/about-story.svg", sceneSvg(1200, 900, 7, ["bow", "ring"], "About Hairtie")]);

["bow", "tote", "scrunchie", "clawclip", "sling", "clutch"].forEach((kind, i) => {
  files.push([`instagram/ig-${i + 1}.svg`, sceneSvg(700, 700, i, [kind], `Hairtie on Instagram ${i + 1}`)]);
});

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

// Three shots per piece, in three colourways.
Object.values(CATEGORY_ART)
  .filter((value, i, all) => all.indexOf(value) === i)
  .forEach((kind) => {
    for (let angle = 1; angle <= 3; angle += 1) {
      for (let tone = 0; tone < 3; tone += 1) {
        files.push([
          `products/${kind}-${tone + 1}-${angle}.svg`,
          productSvg(kind, tone * 3 + angle, angle, `${kind} product photo ${angle}`),
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
      .webp({ quality: 88, effort: 5 })
      .toFile(target);
  }),
);

console.log(`Generated ${files.length} images in public/images`);
