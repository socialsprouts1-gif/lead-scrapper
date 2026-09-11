/**
 * Seeds the store with a realistic demo catalogue, the default homepage layout
 * and the content pages. Everything here is meant to be replaced by real
 * Hairtie products and photos from the admin panel.
 *
 * Run with:  npm run db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { DEFAULT_SITE_SETTINGS, DEFAULT_THEME } from "../src/lib/settings";
import { SECTION_MAP } from "../src/lib/sections";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const rupees = (n: number) => n * 100;

/* -------------------------------------------------------------------------- */
/* Categories                                                                 */
/* -------------------------------------------------------------------------- */

type CategorySeed = {
  name: string;
  slug: string;
  description: string;
  art: string;
  featured?: boolean;
  children?: CategorySeed[];
};

const CATEGORIES: CategorySeed[] = [
  {
    name: "Hair Accessories",
    slug: "hair-accessories",
    art: "hair-accessories",
    featured: true,
    description:
      "Claw clips, scrunchies, bows and bands — the small pieces that finish a look in seconds.",
    children: [
      { name: "Claw Clips", slug: "claw-clips", art: "claw-clips", featured: true, description: "Strong, pretty clips that hold a full bun all day." },
      { name: "Scrunchies", slug: "scrunchies", art: "scrunchies", featured: true, description: "Satin, velvet and cotton scrunchies that are kind to your hair." },
      { name: "Hair Bows", slug: "hair-bows", art: "hair-bows", featured: true, description: "Ribbon bows in every size, from tiny to statement." },
      { name: "Hair Bands", slug: "hair-bands", art: "hair-bands", featured: true, description: "Padded, knotted and pearl-set headbands for easy mornings." },
      { name: "Hair Clips", slug: "hair-clips", art: "hair-clips", featured: true, description: "Snap clips, pins and minimal metal clips." },
    ],
  },
  {
    name: "Handbags",
    slug: "handbags",
    art: "handbags",
    featured: true,
    description:
      "Slings, totes, shoulder bags and clutches — carried every day, dressed up when needed.",
    children: [
      { name: "Sling Bags", slug: "sling-bags", art: "sling-bags", featured: true, description: "Light crossbody bags for hands-free days." },
      { name: "Shoulder Bags", slug: "shoulder-bags", art: "shoulder-bags", featured: true, description: "Soft, slouchy shapes that sit close to you." },
      { name: "Tote Bags", slug: "tote-bags", art: "tote-bags", featured: true, description: "Roomy totes for work, college and long errands." },
      { name: "Clutches", slug: "clutches", art: "clutches", featured: true, description: "Occasion bags for weddings, dinners and evenings out." },
    ],
  },
  {
    name: "Other Accessories",
    slug: "other-accessories",
    art: "other-accessories",
    featured: true,
    description: "Ribbons, pouches and the little extras that go with everything.",
  },
];

/* -------------------------------------------------------------------------- */
/* Products                                                                   */
/* -------------------------------------------------------------------------- */

type ProductSeed = {
  name: string;
  category: string;
  art: string;
  price: number;
  mrp: number;
  short: string;
  description: string;
  material: string;
  colors: [string, string][];
  attributes: [string, string][];
  tags: string[];
  stock?: number;
  weight?: number;
  dims?: [number, number, number];
  flags?: Partial<Record<"isNewArrival" | "isBestseller" | "isTrending" | "isFeatured" | "isOnSale", boolean>>;
};

const BAG_CARE =
  "Wipe with a soft dry cloth. Keep away from direct sunlight and water. Store stuffed with tissue to hold its shape.";
const HAIR_CARE = "Hand wash in cold water with mild detergent. Air dry flat. Do not iron or wring.";

const PRODUCTS: ProductSeed[] = [
  // ---- Claw clips ---------------------------------------------------------
  {
    name: "Marble Swirl Claw Clip",
    category: "claw-clips",
    art: "clawclip",
    price: 399, mrp: 599,
    short: "A large jaw clip in a soft marbled finish, strong enough for thick hair.",
    description:
      "Our most-reordered claw clip. The jaw is set with a firm internal spring, so it holds a full twist without slipping through the day. The marbled acetate finish catches the light gently — quiet enough for office, pretty enough for dinner.",
    material: "Cellulose acetate with steel spring",
    colors: [["Ivory", "#f2ece3"], ["Mocha", "#8d6a5b"], ["Blush", "#e9c2c0"]],
    attributes: [["Size", "10 cm (large)"], ["Hold", "Strong — suits thick and medium hair"], ["Teeth", "9 rounded teeth"], ["Best for", "Buns, twists, half-up styles"]],
    tags: ["everyday", "bestseller", "office"],
    stock: 64, weight: 34,
    flags: { isBestseller: true, isFeatured: true, isOnSale: true },
  },
  {
    name: "Tortoise Shell Jaw Clip",
    category: "claw-clips",
    art: "clawclip",
    price: 449, mrp: 649,
    short: "The classic tortoise finish, in a medium size that works on most hair types.",
    description:
      "A shape that never really goes out of style. Medium jaw, rounded teeth and a warm tortoise pattern that goes with browns, creams and black equally well.",
    material: "Cellulose acetate",
    colors: [["Tortoise", "#8a5a34"], ["Dark Tortoise", "#4a3323"]],
    attributes: [["Size", "9 cm (medium)"], ["Hold", "Medium to strong"], ["Best for", "Everyday twists"]],
    tags: ["classic", "everyday"],
    stock: 41, weight: 30,
    flags: { isBestseller: true },
  },
  {
    name: "Pearl Edge Claw Clip",
    category: "claw-clips",
    art: "clawclip",
    price: 549, mrp: 749,
    short: "Faux pearls set along the top edge — for days that need a little more.",
    description:
      "Hand-set faux pearls run along the spine of this clip. Light enough to wear all evening, and it photographs beautifully at weddings and mehendis.",
    material: "Acetate with faux pearl detail",
    colors: [["Ivory Pearl", "#f4efe6"], ["Blush Pearl", "#eecfcb"]],
    attributes: [["Size", "9.5 cm"], ["Hold", "Medium"], ["Best for", "Occasions, festive wear"]],
    tags: ["festive", "gifting", "pearl"],
    stock: 28, weight: 38,
    flags: { isTrending: true, isNewArrival: true },
  },
  {
    name: "Mini Everyday Claw Clip — Set of 3",
    category: "claw-clips",
    art: "clawclip",
    price: 299, mrp: 449,
    short: "Three small clips for half-up styles, fringes and quick fixes.",
    description:
      "The set we reach for most. Small jaws that grip a fringe or a half-up section without pulling. Comes in three neutral shades that suit almost any outfit.",
    material: "Acetate",
    colors: [["Neutral Set", "#d9c8bb"]],
    attributes: [["Size", "5 cm each"], ["Pieces", "3 clips"], ["Best for", "Fringe, half-up, fine hair"]],
    tags: ["set", "everyday", "value"],
    stock: 88, weight: 26,
    flags: { isBestseller: true, isOnSale: true },
  },
  {
    name: "Matte Blush Claw Clip",
    category: "claw-clips",
    art: "clawclip",
    price: 379, mrp: 499,
    short: "A soft matte finish in our signature blush — no shine, no slip.",
    description:
      "Matte acetate with a slightly grippy surface, so it holds freshly washed hair better than a glossy clip. Our own blush shade, mixed to sit somewhere between rose and nude.",
    material: "Matte acetate",
    colors: [["Blush", "#e9c2c0"], ["Sand", "#ded0bf"], ["Charcoal", "#3f3a37"]],
    attributes: [["Size", "9 cm"], ["Hold", "Strong"], ["Finish", "Matte"]],
    tags: ["everyday", "matte"],
    stock: 52, weight: 32,
    flags: { isNewArrival: true },
  },
  // ---- Scrunchies ---------------------------------------------------------
  {
    name: "Mulberry Satin Scrunchie",
    category: "scrunchies",
    art: "scrunchie",
    price: 249, mrp: 349,
    short: "Smooth satin that doesn't crease your hair or leave a dent.",
    description:
      "Cut generously so it wraps three times on most hair. The satin surface slides against the hair shaft instead of pulling at it — the reason people switch and don't go back.",
    material: "Satin (polyester)",
    colors: [["Ivory", "#f4efe6"], ["Champagne", "#e6d4b8"], ["Rosewood", "#a86a68"], ["Black", "#2b2724"]],
    attributes: [["Diameter", "11 cm relaxed"], ["Elastic", "Soft covered elastic"], ["Best for", "All hair types, overnight wear"]],
    tags: ["satin", "bestseller", "gifting"],
    stock: 120, weight: 12,
    flags: { isBestseller: true, isFeatured: true },
  },
  {
    name: "Velvet Scrunchie — Set of 3",
    category: "scrunchies",
    art: "scrunchie",
    price: 349, mrp: 549,
    short: "Three plush velvet scrunchies in deep winter shades.",
    description:
      "Velvet grips a little more than satin, which makes it our pick for ponytails that need to stay put. The set arrives in a small drawstring pouch — easy to gift as it is.",
    material: "Cotton-blend velvet",
    colors: [["Wine / Forest / Navy", "#6b2c39"]],
    attributes: [["Pieces", "3 scrunchies"], ["Diameter", "10 cm relaxed"], ["Packaging", "Cotton drawstring pouch"]],
    tags: ["set", "gifting", "winter"],
    stock: 74, weight: 32,
    flags: { isBestseller: true, isOnSale: true },
  },
  {
    name: "Ribbed Cotton Scrunchie Duo",
    category: "scrunchies",
    art: "scrunchie",
    price: 199, mrp: 299,
    short: "Everyday cotton in two soft neutrals — gym, home, everywhere.",
    description:
      "Breathable ribbed cotton with a gentle stretch. These are the ones that live on your wrist. Machine washable in a laundry bag.",
    material: "Ribbed cotton",
    colors: [["Oat / Grey", "#d6cec2"]],
    attributes: [["Pieces", "2 scrunchies"], ["Care", "Machine wash in a laundry bag"], ["Best for", "Everyday, workouts"]],
    tags: ["everyday", "cotton", "value"],
    stock: 140, weight: 18,
  },
  {
    name: "Organza Bow Scrunchie",
    category: "scrunchies",
    art: "scrunchie",
    price: 329, mrp: 449,
    short: "A sheer organza bow tied over a satin base.",
    description:
      "Half scrunchie, half bow. The organza holds its shape so the loops stay open instead of drooping — it stays photogenic through a whole evening.",
    material: "Organza over satin",
    colors: [["Ivory", "#f4efe6"], ["Baby Pink", "#f0cfd3"], ["Sage", "#c3cdbc"]],
    attributes: [["Bow width", "13 cm"], ["Best for", "Occasions, festive"]],
    tags: ["bow", "festive", "new"],
    stock: 45, weight: 16,
    flags: { isNewArrival: true, isTrending: true },
  },
  // ---- Hair bows ----------------------------------------------------------
  {
    name: "Oversized Satin Bow Clip",
    category: "hair-bows",
    art: "bow",
    price: 499, mrp: 699,
    short: "A big, confident bow on a strong French barrette.",
    description:
      "The statement piece of the collection. Wired loops keep the bow standing, and the French barrette underneath is the proper metal kind — it will hold a thick half-up.",
    material: "Satin with metal barrette",
    colors: [["Ivory", "#f4efe6"], ["Black", "#2b2724"], ["Cherry", "#a3242f"]],
    attributes: [["Bow width", "16 cm"], ["Clip", "French barrette, 8 cm"], ["Best for", "Half-up, low ponytails"]],
    tags: ["statement", "trending", "bow"],
    stock: 38, weight: 28,
    flags: { isTrending: true, isFeatured: true },
  },
  {
    name: "Grosgrain Ribbon Bow — Set of 2",
    category: "hair-bows",
    art: "bow",
    price: 299, mrp: 399,
    short: "Crisp grosgrain bows on snap clips, in two everyday shades.",
    description:
      "Grosgrain has a fine rib that keeps the bow looking neat all day, even after being pushed into a bag. On easy snap clips that work in fine hair.",
    material: "Grosgrain ribbon",
    colors: [["Ivory / Navy", "#e8e2d6"]],
    attributes: [["Bow width", "9 cm"], ["Pieces", "2 bows"], ["Clip", "Snap clip"]],
    tags: ["set", "everyday", "bow"],
    stock: 96, weight: 18,
  },
  {
    name: "Pearl Centre Bow Pin",
    category: "hair-bows",
    art: "bow",
    price: 379, mrp: 529,
    short: "A small bow with a single pearl at the knot.",
    description:
      "Delicate enough to wear two at a time. We use a single flat-back pearl at the centre so it sits close to the head and doesn't catch on scarves.",
    material: "Satin with faux pearl",
    colors: [["Ivory", "#f4efe6"], ["Blush", "#eecfcb"]],
    attributes: [["Bow width", "7 cm"], ["Clip", "Alligator pin"], ["Best for", "Fine hair, layering"]],
    tags: ["pearl", "delicate", "bow"],
    stock: 62, weight: 12,
    flags: { isNewArrival: true },
  },
  {
    name: "Everyday Mini Bow Set of 4",
    category: "hair-bows",
    art: "bow",
    price: 349, mrp: 549,
    short: "Four small bows in soft neutrals, for braids and half-ups.",
    description:
      "Small bows are the easiest way to make a plain braid look finished. This set covers the four shades we sell the most of.",
    material: "Satin ribbon",
    colors: [["Neutral Set", "#e3d4c6"]],
    attributes: [["Bow width", "6 cm"], ["Pieces", "4 bows"], ["Clip", "Snap clip"]],
    tags: ["set", "value", "bow"],
    stock: 84, weight: 24,
    flags: { isOnSale: true },
  },
  // ---- Hair bands ---------------------------------------------------------
  {
    name: "Knotted Headband — Blush",
    category: "hair-bands",
    art: "hairband",
    price: 449, mrp: 599,
    short: "A padded top-knot band that doesn't press behind the ears.",
    description:
      "The inside edge is wrapped in soft jersey and the frame is slightly wider at the crown, which spreads the pressure. If other headbands give you a headache after an hour, try this one.",
    material: "Jersey over padded frame",
    colors: [["Blush", "#e9c2c0"], ["Ivory", "#f4efe6"], ["Black", "#2b2724"]],
    attributes: [["Width", "4 cm at crown"], ["Fit", "One size, gentle grip"], ["Best for", "All-day wear"]],
    tags: ["headband", "comfort", "bestseller"],
    stock: 47, weight: 42,
    flags: { isBestseller: true },
  },
  {
    name: "Padded Velvet Headband",
    category: "hair-bands",
    art: "hairband",
    price: 499, mrp: 699,
    short: "Deep velvet, softly padded, for festive days.",
    description:
      "A wider padded band in cotton-blend velvet. Sits beautifully with straight hair and with curls, and reads dressy without any embellishment.",
    material: "Cotton-blend velvet",
    colors: [["Wine", "#6b2c39"], ["Forest", "#3c4f42"], ["Black", "#2b2724"]],
    attributes: [["Width", "5 cm"], ["Fit", "One size"], ["Best for", "Festive, winter"]],
    tags: ["velvet", "festive", "headband"],
    stock: 36, weight: 48,
  },
  {
    name: "Pearl Studded Hairband",
    category: "hair-bands",
    art: "hairband",
    price: 599, mrp: 849,
    short: "A slim band lined with graduated faux pearls.",
    description:
      "Pearls graduate from small at the ears to larger at the crown. A finished, ceremony-ready piece that still works over jeans and a white shirt.",
    material: "Metal frame with faux pearls",
    colors: [["Ivory Pearl", "#f4efe6"]],
    attributes: [["Width", "1.5 cm"], ["Pearls", "Graduated, hand-set"], ["Best for", "Occasions"]],
    tags: ["pearl", "festive", "gifting"],
    stock: 24, weight: 38,
    flags: { isTrending: true },
  },
  // ---- Hair clips ---------------------------------------------------------
  {
    name: "Gold Tone Snap Clips — Set of 6",
    category: "hair-clips",
    art: "clip",
    price: 349, mrp: 499,
    short: "Six slim metal clips for pinning back layers.",
    description:
      "Plain, flat and useful. Six clips in a warm gold tone, thin enough to disappear into hair or to be lined up on purpose.",
    material: "Gold-tone alloy",
    colors: [["Gold", "#c8a05a"], ["Silver", "#c5c7ca"]],
    attributes: [["Length", "5.5 cm"], ["Pieces", "6 clips"], ["Best for", "Layers, fringes, styling"]],
    tags: ["set", "minimal", "everyday"],
    stock: 92, weight: 22,
    flags: { isBestseller: true },
  },
  {
    name: "Pearl Bobby Pin Set",
    category: "hair-clips",
    art: "clip",
    price: 299, mrp: 399,
    short: "Eight bobby pins topped with tiny pearls.",
    description:
      "The quickest way to dress up a bun. Pearls are flat-backed and glued on a reinforced pad, so they survive being tipped into a handbag.",
    material: "Alloy with faux pearls",
    colors: [["Gold", "#c8a05a"]],
    attributes: [["Length", "5 cm"], ["Pieces", "8 pins"], ["Best for", "Buns, updos"]],
    tags: ["pearl", "set", "festive"],
    stock: 78, weight: 18,
  },
  {
    name: "Minimal Rectangle Clips — Pair",
    category: "hair-clips",
    art: "clip",
    price: 279, mrp: 379,
    short: "Two clean rectangular clips in matte enamel.",
    description:
      "Quiet, architectural clips for people who don't want a bow. Matte enamel over a sturdy snap base.",
    material: "Enamel-coated alloy",
    colors: [["Ivory", "#f4efe6"], ["Black", "#2b2724"], ["Sage", "#c3cdbc"]],
    attributes: [["Length", "6 cm"], ["Pieces", "2 clips"], ["Finish", "Matte enamel"]],
    tags: ["minimal", "everyday"],
    stock: 66, weight: 20,
    flags: { isNewArrival: true },
  },
  // ---- Sling bags ---------------------------------------------------------
  {
    name: "Isla Quilted Sling",
    category: "sling-bags",
    art: "sling",
    price: 1499, mrp: 2199,
    short: "A quilted crossbody with a gold chain-and-leatherette strap.",
    description:
      "Small but genuinely usable — a phone, a card holder, keys and a compact all sit flat inside. The strap is half chain, half leatherette, so it doesn't dig into your shoulder on a long evening.",
    material: "Quilted vegan leather",
    colors: [["Ivory", "#f2ece3"], ["Black", "#2b2724"], ["Blush", "#e9c2c0"], ["Tan", "#b08256"]],
    attributes: [["Strap type", "Detachable chain and leatherette, adjustable"], ["Strap drop", "58 cm"], ["Compartments", "1 main, 1 slip pocket"], ["Closure", "Magnetic flap"], ["Lining", "Soft polyester"]],
    tags: ["crossbody", "evening", "bestseller"],
    stock: 22, weight: 420, dims: [22, 7, 15],
    flags: { isBestseller: true, isFeatured: true, isOnSale: true },
  },
  {
    name: "Nia Mini Sling",
    category: "sling-bags",
    art: "sling",
    price: 1099, mrp: 1599,
    short: "A tiny structured sling for the days you carry almost nothing.",
    description:
      "Structured enough to keep its box shape when empty. Fits a large phone, cards and a lip balm — designed for markets, walks and short evenings.",
    material: "Vegan leather",
    colors: [["Tan", "#b08256"], ["Ivory", "#f2ece3"], ["Olive", "#6f7357"]],
    attributes: [["Strap type", "Adjustable webbing, detachable"], ["Strap drop", "60 cm"], ["Compartments", "1 main"], ["Closure", "Zip"]],
    tags: ["mini", "crossbody", "everyday"],
    stock: 31, weight: 320, dims: [18, 6, 12],
    flags: { isNewArrival: true },
  },
  {
    name: "Everyday Crossbody Sling",
    category: "sling-bags",
    art: "sling",
    price: 1299, mrp: 1799,
    short: "The one that goes to college, to work and to the market.",
    description:
      "Two compartments and a back zip pocket, so your phone has its own place. The webbing strap is wide enough to wear all day without marking your shoulder.",
    material: "Water-resistant nylon with vegan leather trim",
    colors: [["Black", "#2b2724"], ["Stone", "#cdc3b6"], ["Navy", "#2f3a4d"]],
    attributes: [["Strap type", "Wide adjustable webbing"], ["Strap drop", "62 cm"], ["Compartments", "2 main, 1 back zip, 1 inner slip"], ["Closure", "Zip"]],
    tags: ["everyday", "college", "practical"],
    stock: 40, weight: 380, dims: [24, 8, 18],
    flags: { isBestseller: true },
  },
  // ---- Shoulder bags ------------------------------------------------------
  {
    name: "Mira Shoulder Bag",
    category: "shoulder-bags",
    art: "shoulder",
    price: 1899, mrp: 2699,
    short: "A soft baguette shape that tucks neatly under the arm.",
    description:
      "The shape everyone asked us for. Unstructured enough to sit flat against you, with a short strap sized properly for an under-the-arm carry rather than a hopeful compromise.",
    material: "Soft vegan leather",
    colors: [["Chocolate", "#5a3a2c"], ["Ivory", "#f2ece3"], ["Black", "#2b2724"]],
    attributes: [["Strap type", "Fixed shoulder strap"], ["Strap drop", "22 cm"], ["Compartments", "1 main, 1 inner zip"], ["Closure", "Top zip"], ["Lining", "Cotton twill"]],
    tags: ["baguette", "trending", "evening"],
    stock: 18, weight: 480, dims: [28, 8, 16],
    flags: { isTrending: true, isFeatured: true },
  },
  {
    name: "Aria Slouch Shoulder Bag",
    category: "shoulder-bags",
    art: "shoulder",
    price: 2199, mrp: 2999,
    short: "A generous slouchy hobo that swallows a whole day's things.",
    description:
      "Cut from a softer, heavier material so it falls into pleats as it fills. Big enough for a book, a water bottle and a folded stole.",
    material: "Pebbled vegan leather",
    colors: [["Taupe", "#9b8a7b"], ["Black", "#2b2724"]],
    attributes: [["Strap type", "Fixed, padded shoulder strap"], ["Strap drop", "26 cm"], ["Compartments", "1 main, 2 slip, 1 zip"], ["Closure", "Magnetic snap"]],
    tags: ["hobo", "roomy"],
    stock: 15, weight: 620, dims: [34, 12, 28],
  },
  {
    name: "Ruched Occasion Shoulder Bag",
    category: "shoulder-bags",
    art: "shoulder",
    price: 1699, mrp: 2399,
    short: "Gathered satin-finish bag for weddings and dinners.",
    description:
      "Gathered along the top edge so it catches light without any hardware. Small chain handle inside the ruching, so you can carry it or wear it.",
    material: "Satin-finish vegan leather",
    colors: [["Champagne", "#e6d4b8"], ["Rosewood", "#a86a68"], ["Black", "#2b2724"]],
    attributes: [["Strap type", "Chain shoulder strap, tuckable"], ["Strap drop", "24 cm"], ["Compartments", "1 main"], ["Closure", "Magnetic"]],
    tags: ["occasion", "festive", "wedding"],
    stock: 21, weight: 360, dims: [26, 7, 14],
    flags: { isNewArrival: true, isTrending: true },
  },
  // ---- Tote bags ----------------------------------------------------------
  {
    name: "Noor Canvas Tote",
    category: "tote-bags",
    art: "tote",
    price: 1299, mrp: 1799,
    short: "Heavy cotton canvas with leather-look handles and a laptop sleeve.",
    description:
      "Built for a real working day: a padded 14-inch laptop sleeve, a zip pocket for the small things and a flat base so the bag stands up on its own on the floor.",
    material: "16 oz cotton canvas with vegan leather handles",
    colors: [["Natural", "#e2d8c6"], ["Black", "#2b2724"], ["Olive", "#6f7357"]],
    attributes: [["Strap type", "Double top handles"], ["Strap drop", "24 cm"], ["Compartments", "1 main, padded laptop sleeve (14\"), 1 zip"], ["Closure", "Magnetic snap"], ["Base", "Flat, stands upright"]],
    tags: ["work", "laptop", "bestseller"],
    stock: 34, weight: 640, dims: [38, 12, 33],
    flags: { isBestseller: true, isFeatured: true },
  },
  {
    name: "Everyday Shopper Tote",
    category: "tote-bags",
    art: "tote",
    price: 999, mrp: 1499,
    short: "A light, foldable tote that lives in your other bag.",
    description:
      "Folds into its own inner pocket and weighs almost nothing, but takes a full grocery run. The seams are double-stitched at the handles, where these bags usually give up.",
    material: "Water-resistant recycled nylon",
    colors: [["Stone", "#cdc3b6"], ["Blush", "#e9c2c0"], ["Navy", "#2f3a4d"]],
    attributes: [["Strap type", "Double top handles"], ["Strap drop", "26 cm"], ["Compartments", "1 main, 1 inner slip"], ["Closure", "Open top with snap"], ["Folds", "Yes, into inner pocket"]],
    tags: ["light", "value", "everyday"],
    stock: 58, weight: 240, dims: [40, 10, 34],
    flags: { isOnSale: true },
  },
  {
    name: "Structured Work Tote",
    category: "tote-bags",
    art: "tote",
    price: 2499, mrp: 3499,
    short: "A firm, formal tote that keeps its shape through a full week.",
    description:
      "For work that involves meetings. Reinforced sides, protective metal feet on the base and enough internal organisation that you stop losing your pen.",
    material: "Structured vegan leather",
    colors: [["Black", "#2b2724"], ["Chocolate", "#5a3a2c"], ["Taupe", "#9b8a7b"]],
    attributes: [["Strap type", "Top handles + detachable shoulder strap"], ["Strap drop", "22 cm / 52 cm"], ["Compartments", "2 main, 1 centre zip, 3 slip"], ["Closure", "Top zip"], ["Base", "Metal feet"]],
    tags: ["work", "formal", "premium"],
    stock: 12, weight: 880, dims: [40, 14, 30],
    flags: { isFeatured: true },
  },
  // ---- Clutches -----------------------------------------------------------
  {
    name: "Pearl Handle Clutch",
    category: "clutches",
    art: "clutch",
    price: 1799, mrp: 2499,
    short: "A boxy clutch with a curved faux-pearl handle.",
    description:
      "The handle is the whole point — a single curve of faux pearls that photographs beautifully and sits comfortably over the fingers. Comes with a fine chain if you'd rather wear it.",
    material: "Satin-finish vegan leather with faux pearl handle",
    colors: [["Ivory", "#f2ece3"], ["Champagne", "#e6d4b8"]],
    attributes: [["Strap type", "Pearl top handle + detachable chain"], ["Strap drop", "55 cm (chain)"], ["Compartments", "1 main"], ["Closure", "Clasp"]],
    tags: ["wedding", "festive", "pearl"],
    stock: 16, weight: 380, dims: [22, 6, 13],
    flags: { isTrending: true },
  },
  {
    name: "Satin Evening Clutch",
    category: "clutches",
    art: "clutch",
    price: 1199, mrp: 1699,
    short: "A slim satin envelope for dinners and receptions.",
    description:
      "Flat, quiet and easy to hold. There is a thin chain tucked inside for when you want your hands back.",
    material: "Satin over structured base",
    colors: [["Black", "#2b2724"], ["Rosewood", "#a86a68"], ["Champagne", "#e6d4b8"]],
    attributes: [["Strap type", "Concealed chain"], ["Strap drop", "56 cm"], ["Compartments", "1 main, 1 card slip"], ["Closure", "Magnetic flap"]],
    tags: ["evening", "occasion"],
    stock: 26, weight: 280, dims: [26, 4, 14],
  },
  {
    name: "Beaded Occasion Clutch",
    category: "clutches",
    art: "clutch",
    price: 2299, mrp: 3299,
    short: "Hand-beaded, for the weddings you actually dress up for.",
    description:
      "Beaded by hand across the front panel, which means small differences between pieces — that is the nature of the work, not a flaw. Fully lined and surprisingly light.",
    material: "Hand-beaded fabric on structured base",
    colors: [["Ivory Gold", "#e8dcc0"], ["Rose", "#dbaeb0"]],
    attributes: [["Strap type", "Detachable chain"], ["Strap drop", "54 cm"], ["Compartments", "1 main"], ["Closure", "Kiss lock"], ["Note", "Hand-beaded — slight variation is expected"]],
    tags: ["wedding", "handmade", "premium"],
    stock: 9, weight: 420, dims: [24, 6, 13],
    flags: { isFeatured: true, isNewArrival: true },
  },
  // ---- Other --------------------------------------------------------------
  {
    name: "Silk Hair Ribbon",
    category: "other-accessories",
    art: "ring",
    price: 349, mrp: 499,
    short: "A long silk-blend ribbon to tie into braids and ponytails.",
    description:
      "A metre and a half of soft silk-blend ribbon with finished edges. Tie it around a bun, weave it into a braid, or use it as a bag charm.",
    material: "Silk blend",
    colors: [["Ivory", "#f4efe6"], ["Blush", "#e9c2c0"], ["Sage", "#c3cdbc"]],
    attributes: [["Length", "150 cm"], ["Width", "4 cm"], ["Edges", "Hand-finished"]],
    tags: ["ribbon", "gifting"],
    stock: 54, weight: 20,
  },
  {
    name: "Travel Jewellery Pouch",
    category: "other-accessories",
    art: "ring",
    price: 799, mrp: 1099,
    short: "A small padded round case for earrings and rings.",
    description:
      "Padded outside, soft inside, with a centre post for rings and a mesh pocket for studs. Small enough to sit in a handbag without being noticed.",
    material: "Vegan leather with velvet lining",
    colors: [["Blush", "#e9c2c0"], ["Ivory", "#f2ece3"], ["Black", "#2b2724"]],
    attributes: [["Diameter", "11 cm"], ["Compartments", "1 main, ring post, mesh pocket"], ["Closure", "Zip"]],
    tags: ["travel", "gifting", "organiser"],
    stock: 33, weight: 140, dims: [11, 5, 11],
    flags: { isNewArrival: true },
  },
  {
    name: "Mini Coin Purse",
    category: "other-accessories",
    art: "ring",
    price: 599, mrp: 849,
    short: "A little zip purse for cards, coins and earphones.",
    description:
      "The kind of small thing that quietly organises a bag. Holds six cards plus change, and clips onto a bag strap with the included ring.",
    material: "Vegan leather",
    colors: [["Tan", "#b08256"], ["Blush", "#e9c2c0"], ["Black", "#2b2724"]],
    attributes: [["Size", "11 × 8 cm"], ["Compartments", "1 main, 2 card slots"], ["Closure", "Zip"], ["Extras", "Detachable key ring"]],
    tags: ["small", "gifting", "organiser"],
    stock: 47, weight: 90, dims: [11, 2, 8],
  },
];

/* -------------------------------------------------------------------------- */
/* Homepage & content pages                                                   */
/* -------------------------------------------------------------------------- */

function section(type: string, overrides: Record<string, unknown> = {}) {
  const def = SECTION_MAP.get(type);
  return { type, settings: { ...(def?.defaults ?? {}), ...overrides } };
}

const HOME_SECTIONS = [
  section("hero"),
  section("productGrid", {
    heading: "New Arrivals",
    subheading: "Just added — fresh pieces from this week's edit.",
    source: "newest",
    limit: 8,
    viewAllHref: "/shop?sort=newest",
  }),
  section("categoryGrid"),
  section("productGrid", {
    heading: "Best Sellers",
    subheading: "The pieces our customers come back for.",
    source: "bestsellers",
    limit: 8,
    viewAllHref: "/shop?sort=bestselling",
  }),
  section("productCarousel", {
    heading: "Trending Collection",
    subheading: "What's moving quickly right now.",
    source: "trending",
    limit: 10,
  }),
  section("promoBanner"),
  section("shopTheLook"),
  section("usps"),
  section("instagram"),
  section("storeLocation"),
  section("testimonials"),
  section("whatsappCta"),
];

const CONTENT_PAGES: {
  slug: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  sections: ReturnType<typeof section>[];
}[] = [
  {
    slug: "about",
    title: "About Hairtie",
    seoTitle: "About Hairtie — Our Story",
    seoDescription:
      "Hairtie is a small Indian label making hair accessories and handbags that feel a little special. Read our story.",
    sections: [
      section("textSection", {
        heading: "Little details. Big style.",
        body:
          "Hairtie started behind a small counter, with one shelf of clips and a lot of opinions about which ones actually hold.\n\nWe still choose that way. Every piece is picked by hand, tried on, and only stocked if it does the job it promises — a clip that holds, a strap that doesn't dig, a satin that doesn't crease your hair overnight.",
        align: "center",
        width: "narrow",
      }),
      section("imageText", {
        heading: "Chosen one by one",
        body:
          "We are not a warehouse. Orders are packed by the same people who choose the stock, and if something isn't right we would rather tell you before it ships than after.\n\nOur store is still open, still the best place to see how a bag falls on the shoulder, and still where most of our regulars find us.",
        imageUrl: "/images/about/about-story.webp",
        buttonLabel: "Visit our store",
        buttonHref: "/store",
        imagePosition: "left",
      }),
      section("usps", { heading: "What we care about" }),
      section("instagram"),
    ],
  },
  {
    slug: "faq",
    title: "Frequently Asked Questions",
    seoTitle: "FAQ — Orders, Shipping & Returns",
    seoDescription: "Answers about ordering, delivery, returns, payments and product care at Hairtie.",
    sections: [
      section("textSection", {
        heading: "How can we help?",
        body: "The questions we're asked most. If yours isn't here, message us on WhatsApp — we usually reply the same day.",
        align: "center",
        width: "narrow",
      }),
      section("faq", {
        heading: "Orders & delivery",
        items: [
          { question: "How long does delivery take?", answer: "Orders are dispatched within 24–48 hours. Most metro addresses receive their order in 3–5 working days, and the rest of India in 4–7 working days." },
          { question: "Do you charge for shipping?", answer: "Shipping is free on orders above ₹999. Below that, a flat ₹79 is added at checkout." },
          { question: "Do you offer Cash on Delivery?", answer: "Yes, COD is available across most pincodes in India. You'll see it as an option at checkout if your pincode supports it." },
          { question: "How do I track my order?", answer: "Use the Track Order page with your order number and the phone number you ordered with. You'll also get the tracking link when we ship." },
          { question: "Can I change my address after ordering?", answer: "If the order hasn't shipped yet, message us on WhatsApp with your order number and we'll update it." },
        ],
      }),
      section("faq", {
        heading: "Returns & products",
        items: [
          { question: "Can I return something?", answer: "Yes — unused items in their original packaging can be returned within 7 days of delivery. Hair accessories that have been worn cannot be returned, for hygiene reasons." },
          { question: "What if my order arrives damaged?", answer: "Send us a photo on WhatsApp within 48 hours of delivery and we'll replace it or refund you, whichever you prefer." },
          { question: "Are the colours accurate?", answer: "We photograph in daylight without heavy editing, but screens differ. If a shade isn't what you expected, you can return it under our normal policy." },
          { question: "How should I care for my bag?", answer: "Wipe with a soft dry cloth, keep it away from water and direct sun, and store it stuffed with tissue so it holds its shape." },
        ],
      }),
      section("whatsappCta", { heading: "Still have a question?", body: "Message us and we'll help you choose." }),
    ],
  },
  {
    slug: "shipping-returns",
    title: "Shipping & Returns",
    seoTitle: "Shipping & Returns Policy",
    seoDescription: "Hairtie shipping timelines, charges, returns, exchanges and refund process.",
    sections: [
      section("textSection", {
        heading: "Shipping & Returns",
        body:
          "## Shipping\n\nOrders are dispatched within 24–48 hours of being placed, Monday to Saturday. You'll receive a tracking link by SMS and email as soon as your parcel leaves us.\n\nDelivery usually takes 3–5 working days to metro cities and 4–7 working days elsewhere in India. Remote pincodes can take a little longer.\n\nShipping is free on orders above ₹999. Below that, a flat rate of ₹79 applies.\n\n## Cash on Delivery\n\nCOD is available across most Indian pincodes. If your pincode isn't serviceable for COD, only prepaid options will appear at checkout.\n\n## Returns\n\nYou can return an unused item in its original packaging within 7 days of delivery. For hygiene reasons, worn hair accessories cannot be returned unless they arrived damaged or faulty.\n\nTo start a return, message us on WhatsApp with your order number and a photo. We'll arrange a pickup where our courier partners support it, or share a return address if they don't.\n\n## Refunds\n\nOnce your return reaches us and passes a quick check, prepaid refunds are issued to the original payment method within 5–7 working days. COD refunds are sent by bank transfer to the account you share with us.\n\n## Exchanges\n\nWe're happy to exchange for a different colour or a different piece of the same value, subject to stock. Message us and we'll hold it for you.\n\n## Damaged or wrong items\n\nSend us a photo within 48 hours of delivery and we'll replace the item or refund you in full — your choice. We cover return shipping in these cases.",
        align: "left",
        width: "narrow",
      }),
    ],
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    seoTitle: "Privacy Policy",
    seoDescription: "How Hairtie collects, uses and protects your personal information.",
    sections: [
      section("textSection", {
        heading: "Privacy Policy",
        body:
          "This page explains what we collect when you shop with Hairtie, why we collect it, and what we do with it.\n\n## What we collect\n\nWhen you place an order we collect your name, phone number, email address and delivery address. If you create an account, we store your email and a securely hashed version of your password — we never store your password itself.\n\nWe also keep a record of your orders so that you and we can look them up later.\n\n## Payments\n\nCard, UPI and net banking payments are handled by our payment gateway. Your card and UPI details are entered on the gateway's own secure form and are never stored on our servers.\n\n## How we use your information\n\nWe use your details to process and deliver your order, to contact you about that order, and to answer your questions. If you have asked to hear from us, we may occasionally send you news about new arrivals. You can ask us to stop at any time.\n\n## Who we share it with\n\nWe share your delivery details with our courier partners so that they can deliver your parcel, and with our payment gateway to process your payment. We do not sell your personal information to anyone.\n\n## Cookies\n\nWe use a small number of cookies to keep you signed in and to remember what is in your bag. If analytics is enabled, we may also use cookies to understand which pages are useful.\n\n## Your choices\n\nYou can ask us for a copy of the information we hold about you, ask us to correct it, or ask us to delete your account. Message us on WhatsApp or email us and we'll take care of it.\n\n## Contact\n\nQuestions about this policy can be sent to the email address listed on our Contact page.",
        align: "left",
        width: "narrow",
      }),
    ],
  },
  {
    slug: "terms",
    title: "Terms & Conditions",
    seoTitle: "Terms & Conditions",
    seoDescription: "The terms that apply when you shop with Hairtie.",
    sections: [
      section("textSection", {
        heading: "Terms & Conditions",
        body:
          "By placing an order on this website you agree to the terms below.\n\n## Orders\n\nAn order is confirmed once payment is successful, or once a Cash on Delivery order has been verified by us. We may cancel an order if an item is out of stock, if the address cannot be serviced, or if we suspect fraud. If we cancel a paid order, we refund it in full.\n\n## Pricing\n\nAll prices are in Indian Rupees and include GST unless stated otherwise. We try to keep prices and stock accurate, but if a listing has a clear error we may cancel the affected order and refund you rather than fulfil it at the wrong price.\n\n## Products\n\nWe photograph our products honestly, but colours can look different across screens. Handmade and hand-beaded items vary slightly from piece to piece — that is part of how they're made.\n\n## Returns\n\nOur returns policy is set out on the Shipping & Returns page and forms part of these terms.\n\n## Accounts\n\nYou are responsible for keeping your account password private. Tell us immediately if you think someone else has used your account.\n\n## Intellectual property\n\nThe photographs, text and design on this website belong to Hairtie and may not be copied or reused without permission.\n\n## Liability\n\nOur responsibility for any order is limited to the value of that order.\n\n## Governing law\n\nThese terms are governed by Indian law, and any dispute will be handled by the courts of the city in which our registered store is located.",
        align: "left",
        width: "narrow",
      }),
    ],
  },
  {
    slug: "contact",
    title: "Contact Us",
    seoTitle: "Contact Hairtie",
    seoDescription: "Message Hairtie on WhatsApp, email us or visit our store.",
    sections: [
      section("textSection", {
        heading: "We'd love to hear from you",
        body: "Whether it's a question about an order or help choosing a gift, we usually reply within a few hours.",
        align: "center",
        width: "narrow",
      }),
    ],
  },
  {
    slug: "store",
    title: "Visit Our Store",
    seoTitle: "Visit the Hairtie Store",
    seoDescription: "Come see Hairtie in person — address, opening hours and directions.",
    sections: [
      section("textSection", {
        heading: "Come see us",
        body: "Everything on this website, plus the pieces that never make it online because they sell out first.",
        align: "center",
        width: "narrow",
      }),
      section("storeLocation", { heading: "Hairtie Store", body: "Try things on, feel the material, and let us help you choose." }),
      section("whatsappCta", { heading: "Planning a visit?", body: "Message us to check if something is in stock before you come.", message: "Hi Hairtie, is this in stock at the store?" }),
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Seed                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  console.log("Seeding Hairtie…");

  // --- settings ------------------------------------------------------------
  await prisma.siteSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", data: DEFAULT_SITE_SETTINGS },
    update: {},
  });
  await prisma.themeSetting.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", data: DEFAULT_THEME },
    update: {},
  });

  // --- admin account -------------------------------------------------------
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@hairtie.in").toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "hairtie1234";
  await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Hairtie Admin",
      passwordHash: await bcrypt.hash(adminPassword, 12),
      role: "ADMIN",
    },
    update: { role: "ADMIN" },
  });
  console.log(`  admin: ${adminEmail}`);

  // --- categories ----------------------------------------------------------
  const categoryIds = new Map<string, string>();
  let position = 0;
  for (const parent of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { slug: parent.slug },
      create: {
        name: parent.name,
        slug: parent.slug,
        description: parent.description,
        imageUrl: `/images/categories/${parent.art}.svg`,
        imageAlt: `${parent.name} at Hairtie`,
        isFeatured: parent.featured ?? false,
        position: position++,
        seoTitle: `${parent.name} — Buy Online at Hairtie`,
        seoDescription: parent.description,
      },
      update: {},
    });
    categoryIds.set(parent.slug, created.id);

    for (const child of parent.children ?? []) {
      const sub = await prisma.category.upsert({
        where: { slug: child.slug },
        create: {
          name: child.name,
          slug: child.slug,
          description: child.description,
          imageUrl: `/images/categories/${child.art}.svg`,
          imageAlt: `${child.name} at Hairtie`,
          isFeatured: child.featured ?? false,
          parentId: created.id,
          position: position++,
          seoTitle: `${child.name} — Buy Online at Hairtie`,
          seoDescription: child.description,
        },
        update: {},
      });
      categoryIds.set(child.slug, sub.id);
    }
  }
  console.log(`  categories: ${categoryIds.size}`);

  // --- tags ----------------------------------------------------------------
  const tagNames = [...new Set(PRODUCTS.flatMap((p) => p.tags))];
  const tagIds = new Map<string, string>();
  for (const name of tagNames) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const tag = await prisma.tag.upsert({
      where: { slug },
      create: { name: name.replace(/(^|\s)\S/g, (c) => c.toUpperCase()), slug },
      update: {},
    });
    tagIds.set(name, tag.id);
  }

  // --- products ------------------------------------------------------------
  let index = 0;
  const productIds = new Map<string, string>();
  for (const seed of PRODUCTS) {
    const slug = seed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const sku = `HT-${seed.category.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, "0")}`;
    const isBag = ["sling-bags", "shoulder-bags", "tote-bags", "clutches"].includes(seed.category);
    const tone = (index % 3) + 1;

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      productIds.set(slug, existing.id);
      index += 1;
      continue;
    }

    const product = await prisma.product.create({
      data: {
        name: seed.name,
        slug,
        sku,
        categoryId: categoryIds.get(seed.category) ?? null,
        shortDescription: seed.short,
        description: seed.description,
        price: rupees(seed.price),
        mrp: rupees(seed.mrp),
        stock: seed.stock ?? 25,
        lowStockThreshold: isBag ? 4 : 10,
        material: seed.material,
        careInstructions: isBag ? BAG_CARE : HAIR_CARE,
        weightGrams: seed.weight ?? 50,
        lengthCm: seed.dims?.[0] ?? null,
        widthCm: seed.dims?.[1] ?? null,
        heightCm: seed.dims?.[2] ?? null,
        hsnCode: isBag ? "4202" : "9615",
        gstRate: isBag ? 18 : 5,
        publishedAt: new Date(Date.now() - index * 36 * 60 * 60 * 1000),
        position: index,
        seoTitle: `${seed.name} — Buy Online | Hairtie`,
        seoDescription: seed.short,
        seoKeywords: seed.tags.join(", "),
        salesCount: Math.max(0, 90 - index * 3 + (seed.flags?.isBestseller ? 120 : 0)),
        viewCount: 400 - index * 7 + (seed.flags?.isTrending ? 700 : 0),
        ...seed.flags,
        images: {
          create: [1, 2, 3].map((angle) => ({
            url: `/images/products/${seed.art}-${tone}-${angle}.svg`,
            alt: `${seed.name} — view ${angle}`,
            position: angle - 1,
            width: 800,
            height: 1000,
          })),
        },
        attributes: {
          create: [
            { name: "Material", value: seed.material, group: "Specifications", position: 0 },
            ...seed.attributes.map(([name, value], i) => ({
              name,
              value,
              group: "Specifications",
              position: i + 1,
            })),
            ...(seed.dims
              ? [
                  { name: "Length", value: `${seed.dims[0]} cm`, group: "Dimensions", position: 0 },
                  { name: "Width", value: `${seed.dims[1]} cm`, group: "Dimensions", position: 1 },
                  { name: "Height", value: `${seed.dims[2]} cm`, group: "Dimensions", position: 2 },
                ]
              : []),
          ],
        },
        variants: {
          create: seed.colors.map(([color, hex], i) => ({
            name: color,
            sku: `${sku}-${color.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, "")}${i}`,
            color,
            colorHex: hex,
            stock: Math.max(2, Math.round((seed.stock ?? 25) / seed.colors.length)),
            position: i,
          })),
        },
        tags: {
          create: seed.tags.map((t) => ({ tagId: tagIds.get(t)! })),
        },
      },
    });
    productIds.set(slug, product.id);
    index += 1;
  }
  console.log(`  products: ${productIds.size}`);

  // --- reviews -------------------------------------------------------------
  const REVIEWS = [
    ["marble-swirl-claw-clip", "Ananya R.", 5, "Finally a clip that holds", "I have very thick hair and most clips give up by lunch. This one doesn't. Bought a second in mocha."],
    ["marble-swirl-claw-clip", "Divya S.", 4, "Pretty and sturdy", "Lovely finish. Slightly bigger than I expected but that's why it holds so well."],
    ["mulberry-satin-scrunchie", "Meher K.", 5, "No more morning dents", "Sleeping in these has genuinely made a difference to my hair in the morning."],
    ["isla-quilted-sling", "Sneha D.", 5, "Looks far more expensive", "Carried it to a wedding and three people asked where it was from. The chain strap is comfortable."],
    ["noor-canvas-tote", "Priya M.", 5, "Perfect work bag", "Laptop, lunch box, water bottle — all of it fits and the bag still stands up on its own."],
    ["oversized-satin-bow-clip", "Riya T.", 5, "Exactly as pictured", "The bow actually stays open and doesn't flop. Wore it to a mehendi."],
    ["knotted-headband-blush", "Kavya N.", 4, "Comfortable for hours", "No headache after a full day, which was my main worry."],
    ["mira-shoulder-bag", "Ishita B.", 5, "The shape is perfect", "Sits right under the arm. Soft leather feel, and the zip is good quality."],
  ] as const;

  for (const [slug, name, rating, title, body] of REVIEWS) {
    const productId = productIds.get(slug);
    if (!productId) continue;
    const already = await prisma.review.findFirst({ where: { productId, authorName: name } });
    if (already) continue;
    await prisma.review.create({
      data: { productId, authorName: name, rating, title, body, status: "APPROVED", isVerified: true },
    });
    await prisma.product.update({
      where: { id: productId },
      data: { ratingSum: { increment: rating }, reviewCount: { increment: 1 } },
    });
  }

  // --- shop the look -------------------------------------------------------
  const LOOKS = [
    { title: "The Everyday Edit", subtitle: "Clip, sling, done.", image: "/images/lifestyle/lifestyle-1.webp", products: ["marble-swirl-claw-clip", "isla-quilted-sling", "mulberry-satin-scrunchie"] },
    { title: "Work Mornings", subtitle: "Room for everything.", image: "/images/lifestyle/lifestyle-2.webp", products: ["noor-canvas-tote", "gold-tone-snap-clips-set-of-6", "mini-coin-purse"] },
    { title: "Wedding Season", subtitle: "Dressed up, still comfortable.", image: "/images/lifestyle/lifestyle-3.webp", products: ["pearl-handle-clutch", "pearl-studded-hairband", "oversized-satin-bow-clip"] },
  ];
  if ((await prisma.look.count()) === 0) {
    let lookPosition = 0;
    for (const look of LOOKS) {
      await prisma.look.create({
        data: {
          title: look.title,
          subtitle: look.subtitle,
          imageUrl: look.image,
          imageAlt: `${look.title} — styled by Hairtie`,
          position: lookPosition++,
          products: {
            create: look.products
              .map((slug, i) => ({ productId: productIds.get(slug), position: i }))
              .filter((p): p is { productId: string; position: number } => Boolean(p.productId)),
          },
        },
      });
    }
  }

  // --- coupons -------------------------------------------------------------
  const COUPONS = [
    { code: "WELCOME10", description: "10% off your first order", type: "PERCENT" as const, value: 10, maxDiscount: rupees(200), firstOrderOnly: true },
    { code: "HAIRTIE199", description: "₹199 off orders above ₹1499", type: "FIXED" as const, value: rupees(199), minOrderValue: rupees(1499) },
    { code: "BAGS15", description: "15% off all handbags", type: "PERCENT" as const, value: 15, maxDiscount: rupees(500), scope: "CATEGORIES" as const },
  ];
  for (const coupon of COUPONS) {
    const categoryIdsForCoupon =
      coupon.scope === "CATEGORIES"
        ? ["handbags", "sling-bags", "shoulder-bags", "tote-bags", "clutches"]
            .map((s) => categoryIds.get(s))
            .filter((v): v is string => Boolean(v))
        : [];
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      create: {
        code: coupon.code,
        description: coupon.description,
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount ?? null,
        minOrderValue: coupon.minOrderValue ?? 0,
        firstOrderOnly: coupon.firstOrderOnly ?? false,
        scope: coupon.scope ?? "ALL",
        categoryIds: categoryIdsForCoupon,
      },
      update: {},
    });
  }

  // --- pages ---------------------------------------------------------------
  async function createPage(
    slug: string,
    title: string,
    sections: ReturnType<typeof section>[],
    seo?: { seoTitle?: string; seoDescription?: string },
  ) {
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) return;
    await prisma.page.create({
      data: {
        slug,
        title,
        isSystem: true,
        seoTitle: seo?.seoTitle ?? title,
        seoDescription: seo?.seoDescription ?? "",
        publishedSnapshot: sections.map((s, i) => ({ ...s, position: i, isHidden: false })) as unknown as Prisma.InputJsonValue,
        sections: {
          create: sections.map((s, i) => ({
            type: s.type,
            settings: s.settings as Prisma.InputJsonObject,
            position: i,
          })),
        },
      },
    });
  }

  await createPage("home", "Home", HOME_SECTIONS, {
    seoTitle: DEFAULT_SITE_SETTINGS.seo.siteTitle,
    seoDescription: DEFAULT_SITE_SETTINGS.seo.description,
  });
  for (const page of CONTENT_PAGES) {
    await createPage(page.slug, page.title, page.sections, {
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
    });
  }
  console.log(`  pages: ${1 + CONTENT_PAGES.length}`);

  // --- media library -------------------------------------------------------
  if ((await prisma.mediaAsset.count()) === 0) {
    const demoMedia = [
      ...["hero/hero-main", "hero/hero-mobile"].map((p) => ({ path: p, folder: "Banners" })),
      ...["banners/promo-wide", "banners/promo-secondary"].map((p) => ({ path: p, folder: "Banners" })),
      ...["lifestyle/lifestyle-1", "lifestyle/lifestyle-2", "lifestyle/lifestyle-3"].map((p) => ({ path: p, folder: "Lifestyle" })),
      ...["store/hairtie-store", "about/about-story"].map((p) => ({ path: p, folder: "Store" })),
      ...[1, 2, 3, 4, 5, 6].map((n) => ({ path: `instagram/ig-${n}`, folder: "Instagram" })),
    ];
    await prisma.mediaAsset.createMany({
      data: demoMedia.map((m) => ({
        url: `/images/${m.path}.svg`,
        filename: `${m.path.split("/").pop()}.svg`,
        mimeType: "image/svg+xml",
        folder: m.folder,
        alt: "Hairtie demo image",
      })),
    });
  }

  console.log("Done.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
