/**
 * The block registry.
 *
 * Every homepage / landing-page section is described here once: its label, its
 * default content and the list of fields the admin can edit. The storefront
 * renderer and the visual editor both read from this file, so adding a new
 * block type means adding one entry here plus one React component — no changes
 * to the editor UI itself.
 */

export type FieldDef =
  | {
      key: string;
      label: string;
      type: "text" | "textarea" | "image" | "link" | "color" | "toggle" | "richtext";
      help?: string;
      placeholder?: string;
    }
  | { key: string; label: string; type: "number"; min?: number; max?: number; help?: string }
  | {
      key: string;
      label: string;
      type: "select";
      options: { value: string; label: string }[];
      help?: string;
    }
  | { key: string; label: string; type: "category"; help?: string }
  | { key: string; label: string; type: "products"; max?: number; help?: string }
  | {
      key: string;
      label: string;
      type: "repeater";
      itemLabel: string;
      fields: FieldDef[];
      max?: number;
      help?: string;
    };

export type SectionDef = {
  type: string;
  label: string;
  description: string;
  /** Emoji used in the editor's "Add section" list — keeps the panel friendly. */
  icon: string;
  defaults: Record<string, unknown>;
  fields: FieldDef[];
};

const headingFields: FieldDef[] = [
  { key: "heading", label: "Section title", type: "text" },
  { key: "subheading", label: "Short description", type: "textarea" },
];

const productSourceFields: FieldDef[] = [
  {
    key: "source",
    label: "Which products?",
    type: "select",
    options: [
      { value: "newest", label: "Newest arrivals" },
      { value: "bestsellers", label: "Best sellers" },
      { value: "trending", label: "Trending" },
      { value: "featured", label: "Featured" },
      { value: "sale", label: "On sale" },
      { value: "category", label: "From one category" },
      { value: "manual", label: "Products I pick" },
    ],
  },
  { key: "categoryId", label: "Category", type: "category", help: "Used when 'From one category' is selected." },
  { key: "productIds", label: "Pick products", type: "products", help: "Used when 'Products I pick' is selected." },
  { key: "limit", label: "How many products", type: "number", min: 2, max: 24 },
  {
    key: "columns",
    label: "Products per row (desktop)",
    type: "select",
    options: [
      { value: "2", label: "2" },
      { value: "3", label: "3" },
      { value: "4", label: "4" },
    ],
  },
  { key: "viewAllLabel", label: "Link text", type: "text" },
  { key: "viewAllHref", label: "Link goes to", type: "link" },
];

export const SECTION_REGISTRY: SectionDef[] = [
  {
    type: "hero",
    label: "Hero banner",
    description: "Big opening image with a headline and buttons.",
    icon: "🖼️",
    defaults: {
      eyebrow: "New season",
      heading: "Style Your Everyday.",
      subheading:
        "Discover beautiful hair accessories, handbags & more, designed to add something special to every look.",
      imageUrl: "/images/hero/hero-main.webp",
      mobileImageUrl: "",
      primaryLabel: "Shop Now",
      primaryHref: "/shop",
      secondaryLabel: "Explore Collection",
      secondaryHref: "/categories",
      align: "left",
      height: "tall",
      overlay: 25,
    },
    fields: [
      { key: "eyebrow", label: "Small label above the title", type: "text" },
      { key: "heading", label: "Headline", type: "text" },
      { key: "subheading", label: "Sub-heading", type: "textarea" },
      { key: "imageUrl", label: "Banner image", type: "image" },
      { key: "mobileImageUrl", label: "Mobile image (optional)", type: "image", help: "Taller crop for phones. Leave empty to reuse the main image." },
      { key: "primaryLabel", label: "Button 1 text", type: "text" },
      { key: "primaryHref", label: "Button 1 link", type: "link" },
      { key: "secondaryLabel", label: "Button 2 text", type: "text" },
      { key: "secondaryHref", label: "Button 2 link", type: "link" },
      {
        key: "align",
        label: "Text position",
        type: "select",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Centre" },
          { value: "right", label: "Right" },
        ],
      },
      {
        key: "height",
        label: "Banner height",
        type: "select",
        options: [
          { value: "short", label: "Short" },
          { value: "medium", label: "Medium" },
          { value: "tall", label: "Tall" },
        ],
      },
      { key: "overlay", label: "Image darkening (%)", type: "number", min: 0, max: 70 },
    ],
  },
  {
    type: "productGrid",
    label: "Product grid",
    description: "A block of product cards, e.g. New Arrivals or Best Sellers.",
    icon: "🛍️",
    defaults: {
      heading: "New Arrivals",
      subheading: "Fresh pieces, added this week.",
      source: "newest",
      categoryId: "",
      productIds: [],
      limit: 8,
      columns: "4",
      viewAllLabel: "View all",
      viewAllHref: "/shop?sort=newest",
    },
    fields: [...headingFields, ...productSourceFields],
  },
  {
    type: "productCarousel",
    label: "Product carousel",
    description: "Swipeable row of products — lovely on phones.",
    icon: "🎠",
    defaults: {
      heading: "Trending Now",
      subheading: "The pieces everyone is reaching for.",
      source: "trending",
      categoryId: "",
      productIds: [],
      limit: 10,
      columns: "4",
      viewAllLabel: "See more",
      viewAllHref: "/shop",
    },
    fields: [...headingFields, ...productSourceFields],
  },
  {
    type: "categoryGrid",
    label: "Category grid",
    description: "Visual cards linking to your categories.",
    icon: "🗂️",
    defaults: {
      heading: "Shop By Category",
      subheading: "Find your next favourite by the kind of piece you love.",
      style: "card",
      limit: 8,
      featuredOnly: true,
    },
    fields: [
      ...headingFields,
      {
        key: "style",
        label: "Card style",
        type: "select",
        options: [
          { value: "card", label: "Rounded cards" },
          { value: "circle", label: "Circles" },
        ],
      },
      { key: "limit", label: "How many categories", type: "number", min: 2, max: 16 },
      { key: "featuredOnly", label: "Only show featured categories", type: "toggle" },
    ],
  },
  {
    type: "promoBanner",
    label: "Promotional banner",
    description: "Wide banner for an offer or a message.",
    icon: "✨",
    defaults: {
      heading: "Your Everyday Style, Elevated.",
      body: "Handpicked pieces that work as easily with kurtas as they do with denim.",
      buttonLabel: "Shop the edit",
      buttonHref: "/shop",
      imageUrl: "/images/banners/promo-wide.webp",
      layout: "split",
    },
    fields: [
      { key: "heading", label: "Headline", type: "text" },
      { key: "body", label: "Text", type: "textarea" },
      { key: "buttonLabel", label: "Button text", type: "text" },
      { key: "buttonHref", label: "Button link", type: "link" },
      { key: "imageUrl", label: "Image", type: "image" },
      {
        key: "layout",
        label: "Layout",
        type: "select",
        options: [
          { value: "split", label: "Image beside text" },
          { value: "full", label: "Text over full-width image" },
        ],
      },
    ],
  },
  {
    type: "imageText",
    label: "Image + text",
    description: "One image next to a paragraph — good for your story.",
    icon: "📝",
    defaults: {
      heading: "Made for the little details",
      body: "Every Hairtie piece is picked by hand, checked one by one, and chosen because it makes an ordinary morning feel a bit more considered.",
      imageUrl: "/images/lifestyle/lifestyle-1.webp",
      buttonLabel: "Our story",
      buttonHref: "/about",
      imagePosition: "left",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Text", type: "textarea" },
      { key: "imageUrl", label: "Image", type: "image" },
      { key: "buttonLabel", label: "Button text", type: "text" },
      { key: "buttonHref", label: "Button link", type: "link" },
      {
        key: "imagePosition",
        label: "Image on",
        type: "select",
        options: [
          { value: "left", label: "Left" },
          { value: "right", label: "Right" },
        ],
      },
    ],
  },
  {
    type: "shopTheLook",
    label: "Shop the look",
    description: "Lifestyle photos with the products in them.",
    icon: "👜",
    defaults: {
      heading: "Shop The Look",
      subheading: "Styled by us, worn your way.",
      limit: 3,
    },
    fields: [...headingFields, { key: "limit", label: "How many looks", type: "number", min: 1, max: 6 }],
  },
  {
    type: "usps",
    label: "Why us / benefits",
    description: "Three or four short reasons to buy from you.",
    icon: "💗",
    defaults: {
      heading: "Why Hairtie?",
      subheading: "",
      items: [
        { title: "Carefully Curated Styles", body: "Every piece is chosen by hand — nothing filler, nothing loud." },
        { title: "Quality You Can Feel", body: "Checked one by one before it reaches your door." },
        { title: "Easy Shopping", body: "Simple sizes, honest photos and a checkout that takes a minute." },
        { title: "Trusted Offline Store", body: "Come see us in person — we've been here a while." },
      ],
    },
    fields: [
      ...headingFields,
      {
        key: "items",
        label: "Benefits",
        type: "repeater",
        itemLabel: "Benefit",
        max: 4,
        fields: [
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Description", type: "textarea" },
        ],
      },
    ],
  },
  {
    type: "instagram",
    label: "Instagram grid",
    description: "Your Instagram photos with a follow link.",
    icon: "📸",
    defaults: {
      heading: "Follow the Style",
      handle: "@iamhairtie",
      profileUrl: "https://www.instagram.com/iamhairtie",
      buttonLabel: "Follow on Instagram",
      items: [
        { imageUrl: "/images/instagram/ig-1.webp", href: "https://www.instagram.com/iamhairtie" },
        { imageUrl: "/images/instagram/ig-2.webp", href: "https://www.instagram.com/iamhairtie" },
        { imageUrl: "/images/instagram/ig-3.webp", href: "https://www.instagram.com/iamhairtie" },
        { imageUrl: "/images/instagram/ig-4.webp", href: "https://www.instagram.com/iamhairtie" },
        { imageUrl: "/images/instagram/ig-5.webp", href: "https://www.instagram.com/iamhairtie" },
        { imageUrl: "/images/instagram/ig-6.webp", href: "https://www.instagram.com/iamhairtie" },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "handle", label: "Instagram handle", type: "text" },
      { key: "profileUrl", label: "Instagram link", type: "link" },
      { key: "buttonLabel", label: "Button text", type: "text" },
      {
        key: "items",
        label: "Photos",
        type: "repeater",
        itemLabel: "Photo",
        max: 12,
        fields: [
          { key: "imageUrl", label: "Photo", type: "image" },
          { key: "href", label: "Links to", type: "link" },
        ],
      },
    ],
  },
  {
    type: "testimonials",
    label: "Customer reviews",
    description: "What your customers say.",
    icon: "⭐",
    defaults: {
      heading: "Loved by our customers",
      subheading: "",
      items: [
        { name: "Ananya R.", location: "Pune", rating: 5, body: "The claw clips actually hold my hair — and they look so pretty. Ordered three more." },
        { name: "Meher K.", location: "Mumbai", rating: 5, body: "My tote arrived beautifully packed. Quality is much better than I expected for the price." },
        { name: "Sneha D.", location: "Nagpur", rating: 5, body: "Visited the store and picked up the bow set. The staff helped me choose. Lovely experience." },
      ],
    },
    fields: [
      ...headingFields,
      {
        key: "items",
        label: "Reviews",
        type: "repeater",
        itemLabel: "Review",
        max: 9,
        fields: [
          { key: "name", label: "Customer name", type: "text" },
          { key: "location", label: "City", type: "text" },
          { key: "rating", label: "Stars (1–5)", type: "number", min: 1, max: 5 },
          { key: "body", label: "Review", type: "textarea" },
        ],
      },
    ],
  },
  {
    type: "storeLocation",
    label: "Store location",
    description: "Your shop address, hours and directions.",
    icon: "📍",
    defaults: {
      heading: "Prefer to shop in person?",
      body: "Come try things on, feel the fabric and let us help you pick.",
      showMap: true,
      imageUrl: "",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Text", type: "textarea" },
      { key: "imageUrl", label: "Store photo", type: "image", help: "Leave empty to use the photo from Store Settings." },
      { key: "showMap", label: "Show Google Map", type: "toggle" },
    ],
  },
  {
    type: "whatsappCta",
    label: "WhatsApp help",
    description: "A friendly nudge to chat with you on WhatsApp.",
    icon: "💬",
    defaults: {
      heading: "Need Help Choosing?",
      body: "Tell us what you're looking for and we'll send you options.",
      buttonLabel: "Chat on WhatsApp",
      message: "Hi Hairtie, I need help choosing something.",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Text", type: "textarea" },
      { key: "buttonLabel", label: "Button text", type: "text" },
      { key: "message", label: "Pre-filled message", type: "textarea" },
    ],
  },
  {
    type: "faq",
    label: "FAQ",
    description: "Questions and answers that open and close.",
    icon: "❓",
    defaults: {
      heading: "Frequently asked questions",
      subheading: "",
      items: [
        { question: "How long does delivery take?", answer: "Orders are dispatched in 24–48 hours and usually arrive in 3–6 working days." },
        { question: "Can I return something?", answer: "Yes — unused items in original packaging can be returned within 7 days of delivery." },
      ],
    },
    fields: [
      ...headingFields,
      {
        key: "items",
        label: "Questions",
        type: "repeater",
        itemLabel: "Question",
        max: 20,
        fields: [
          { key: "question", label: "Question", type: "text" },
          { key: "answer", label: "Answer", type: "textarea" },
        ],
      },
    ],
  },
  {
    type: "newsletter",
    label: "Newsletter signup",
    description: "Collect email addresses for future offers.",
    icon: "✉️",
    defaults: {
      heading: "Something beautiful, now and then",
      body: "New arrivals and small offers. No spam, we promise.",
      buttonLabel: "Subscribe",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Text", type: "textarea" },
      { key: "buttonLabel", label: "Button text", type: "text" },
    ],
  },
  {
    type: "video",
    label: "Video",
    description: "A YouTube or hosted video.",
    icon: "🎬",
    defaults: {
      heading: "",
      videoUrl: "",
      posterUrl: "",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "videoUrl", label: "Video link", type: "text", help: "A YouTube link, or a direct .mp4 link." },
      { key: "posterUrl", label: "Cover image", type: "image" },
    ],
  },
  {
    type: "textSection",
    label: "Text block",
    description: "A heading and some words.",
    icon: "🔤",
    defaults: {
      heading: "Little details. Big style.",
      body: "Hairtie began with a simple idea: the small things you wear every day should feel special too.",
      align: "center",
      width: "narrow",
    },
    fields: [
      { key: "heading", label: "Heading", type: "text" },
      { key: "body", label: "Text", type: "richtext", help: "Each blank line starts a new paragraph." },
      {
        key: "align",
        label: "Alignment",
        type: "select",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Centre" },
        ],
      },
      {
        key: "width",
        label: "Width",
        type: "select",
        options: [
          { value: "narrow", label: "Narrow" },
          { value: "wide", label: "Wide" },
        ],
      },
    ],
  },
  {
    type: "customImage",
    label: "Single image",
    description: "One image, optionally clickable.",
    icon: "🏞️",
    defaults: { imageUrl: "", alt: "", href: "", width: "wide", radius: true },
    fields: [
      { key: "imageUrl", label: "Image", type: "image" },
      { key: "alt", label: "Image description (for SEO)", type: "text" },
      { key: "href", label: "Links to", type: "link" },
      {
        key: "width",
        label: "Width",
        type: "select",
        options: [
          { value: "narrow", label: "Narrow" },
          { value: "wide", label: "Wide" },
          { value: "full", label: "Full bleed" },
        ],
      },
      { key: "radius", label: "Rounded corners", type: "toggle" },
    ],
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Empty breathing room between sections.",
    icon: "↕️",
    defaults: { height: 48 },
    fields: [{ key: "height", label: "Height in pixels", type: "number", min: 8, max: 240 }],
  },
];

export const SECTION_MAP = new Map(SECTION_REGISTRY.map((s) => [s.type, s]));

export function getSectionDef(type: string) {
  return SECTION_MAP.get(type);
}

export function sectionLabel(type: string) {
  return SECTION_MAP.get(type)?.label ?? type;
}

/** Merge stored settings over the block defaults, so old rows keep working. */
export function withDefaults(type: string, settings: unknown): Record<string, unknown> {
  const def = SECTION_MAP.get(type);
  if (!def) return (settings as Record<string, unknown>) ?? {};
  return { ...def.defaults, ...((settings as Record<string, unknown>) ?? {}) };
}
