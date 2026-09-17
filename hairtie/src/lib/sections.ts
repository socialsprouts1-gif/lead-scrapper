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
      /** Emoji shown against each block in the editor tree. */
      itemIcon?: string;
      /** Which sub-field to use as the block's name in the tree. */
      titleKey?: string;
    };

/** The tabs the "Add a section" picker is grouped into. */
export type SectionGroup =
  | "Banners"
  | "Products"
  | "Content"
  | "Media"
  | "Trust & social"
  | "Utility";

export const SECTION_GROUPS: SectionGroup[] = [
  "Banners",
  "Products",
  "Content",
  "Media",
  "Trust & social",
  "Utility",
];

export type SectionDef = {
  type: string;
  label: string;
  description: string;
  /** Emoji used in the editor's "Add section" list — keeps the panel friendly. */
  icon: string;
  group: SectionGroup;
  /**
   * The repeater field that behaves as this section's *blocks*: the editor
   * shows those items as draggable rows nested under the section, the way a
   * theme editor does, instead of burying them in the settings form.
   */
  blocksKey?: string;
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
    group: "Banners",
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
    group: "Products",
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
    group: "Products",
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
    group: "Products",
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
    group: "Banners",
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
    group: "Content",
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
    group: "Products",
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
    group: "Trust & social",
    blocksKey: "items",
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
        itemIcon: "💗",
        titleKey: "title",
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
    group: "Media",
    blocksKey: "items",
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
        itemIcon: "📸",
        titleKey: "imageUrl",
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
    group: "Trust & social",
    blocksKey: "items",
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
        itemIcon: "⭐",
        titleKey: "name",
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
    group: "Utility",
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
    group: "Utility",
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
    group: "Content",
    blocksKey: "items",
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
        itemIcon: "❓",
        titleKey: "question",
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
    group: "Utility",
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
    group: "Media",
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
    group: "Content",
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
    group: "Media",
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
    type: "columns",
    label: "Feature columns",
    description: "Two to four cards with an image, a title and a link.",
    icon: "🧱",
    group: "Content",
    blocksKey: "items",
    defaults: {
      heading: "Three ways to wear it",
      subheading: "",
      columns: "3",
      align: "left",
      items: [
        {
          imageUrl: "/images/lifestyle/lifestyle-1.webp",
          title: "For the everyday",
          body: "Claw clips and scrunchies that hold all day without pulling.",
          linkLabel: "Shop hair",
          linkHref: "/shop",
        },
        {
          imageUrl: "/images/lifestyle/lifestyle-2.webp",
          title: "For the weekend",
          body: "Totes and slings roomy enough for a full day out.",
          linkLabel: "Shop bags",
          linkHref: "/shop",
        },
        {
          imageUrl: "/images/lifestyle/lifestyle-3.webp",
          title: "For gifting",
          body: "Little sets that look far more expensive than they are.",
          linkLabel: "Shop gifts",
          linkHref: "/shop",
        },
      ],
    },
    fields: [
      ...headingFields,
      {
        key: "columns",
        label: "Columns per row (desktop)",
        type: "select",
        options: [
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
        ],
      },
      {
        key: "align",
        label: "Text alignment",
        type: "select",
        options: [
          { value: "left", label: "Left" },
          { value: "center", label: "Centre" },
        ],
      },
      {
        key: "items",
        label: "Columns",
        type: "repeater",
        itemLabel: "Column",
        itemIcon: "🧱",
        titleKey: "title",
        max: 8,
        fields: [
          { key: "imageUrl", label: "Image", type: "image" },
          { key: "title", label: "Title", type: "text" },
          { key: "body", label: "Text", type: "textarea" },
          { key: "linkLabel", label: "Link text", type: "text" },
          { key: "linkHref", label: "Link goes to", type: "link" },
        ],
      },
    ],
  },
  {
    type: "gallery",
    label: "Image gallery",
    description: "A grid of photos, each one optionally clickable.",
    icon: "🖼",
    group: "Media",
    blocksKey: "items",
    defaults: {
      heading: "From the studio",
      subheading: "",
      columns: "4",
      gap: "normal",
      shape: "square",
      items: [
        { imageUrl: "/images/lifestyle/lifestyle-1.webp", caption: "Everyday edit", href: "/shop" },
        { imageUrl: "/images/lifestyle/lifestyle-2.webp", caption: "Weekend bags", href: "/shop" },
        { imageUrl: "/images/lifestyle/lifestyle-3.webp", caption: "Gift sets", href: "/shop" },
        { imageUrl: "/images/banners/promo-wide.webp", caption: "New season", href: "/shop" },
      ],
    },
    fields: [
      ...headingFields,
      {
        key: "columns",
        label: "Photos per row (desktop)",
        type: "select",
        options: [
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
          { value: "5", label: "5" },
        ],
      },
      {
        key: "shape",
        label: "Photo shape",
        type: "select",
        options: [
          { value: "square", label: "Square" },
          { value: "portrait", label: "Portrait" },
          { value: "landscape", label: "Landscape" },
        ],
      },
      {
        key: "gap",
        label: "Spacing",
        type: "select",
        options: [
          { value: "tight", label: "Tight" },
          { value: "normal", label: "Normal" },
          { value: "roomy", label: "Roomy" },
        ],
      },
      {
        key: "items",
        label: "Photos",
        type: "repeater",
        itemLabel: "Photo",
        itemIcon: "🖼",
        titleKey: "caption",
        max: 20,
        fields: [
          { key: "imageUrl", label: "Photo", type: "image" },
          { key: "caption", label: "Caption", type: "text" },
          { key: "href", label: "Links to", type: "link" },
        ],
      },
    ],
  },
  {
    type: "announcement",
    label: "Announcement strip",
    description: "A slim coloured bar for offers, delivery news or notices.",
    icon: "📣",
    group: "Banners",
    blocksKey: "items",
    defaults: {
      background: "#f3e3e0",
      textColor: "#2f2925",
      items: [
        { text: "Free delivery on orders over ₹999", href: "/shipping-returns" },
        { text: "New arrivals every Friday", href: "/shop?sort=newest" },
        { text: "Visit our store in Nagpur", href: "/store" },
      ],
    },
    fields: [
      { key: "background", label: "Strip colour", type: "color" },
      { key: "textColor", label: "Text colour", type: "color" },
      {
        key: "items",
        label: "Messages",
        type: "repeater",
        itemLabel: "Message",
        itemIcon: "📣",
        titleKey: "text",
        max: 6,
        fields: [
          { key: "text", label: "Message", type: "text" },
          { key: "href", label: "Links to (optional)", type: "link" },
        ],
      },
    ],
  },
  {
    type: "spacer",
    label: "Spacer",
    description: "Empty breathing room between sections.",
    icon: "↕️",
    group: "Utility",
    defaults: { height: 48 },
    fields: [{ key: "height", label: "Height in pixels", type: "number", min: 8, max: 240 }],
  },
];

/** One section as the visual editor holds it in memory. */
export type EditorSection = {
  id: string;
  type: string;
  isHidden: boolean;
  settings: Record<string, unknown>;
};

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

/** The repeater field a section exposes as draggable blocks, if it has one. */
export function getBlocksField(type: string) {
  const def = SECTION_MAP.get(type);
  if (!def?.blocksKey) return null;
  const field = def.fields.find(
    (entry) => entry.key === def.blocksKey && entry.type === "repeater",
  );
  return (field as Extract<FieldDef, { type: "repeater" }> | undefined) ?? null;
}

/** Reads a section's blocks out of its settings. */
export function readBlocks(type: string, settings: unknown): Record<string, unknown>[] {
  const field = getBlocksField(type);
  if (!field) return [];
  const value = (settings as Record<string, unknown> | null)?.[field.key];
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
}

/** A blank block, so "Add block" starts from empty fields rather than undefined. */
export function blankBlock(field: Extract<FieldDef, { type: "repeater" }>) {
  const entry: Record<string, unknown> = {};
  for (const sub of field.fields) entry[sub.key] = sub.type === "number" ? 0 : "";
  return entry;
}

/** The name shown against a block in the editor tree. */
export function blockTitle(
  field: Extract<FieldDef, { type: "repeater" }>,
  item: Record<string, unknown>,
  index: number,
) {
  const keys = [field.titleKey, "title", "question", "name", "heading", "text", "caption"];
  for (const key of keys) {
    if (!key) continue;
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      // Image paths make poor labels — fall back to the numbered item name.
      if (/^(https?:|\/)/.test(value) && /\.(webp|png|jpe?g|gif|avif)$/i.test(value)) continue;
      return value.length > 44 ? `${value.slice(0, 44)}…` : value;
    }
  }
  return `${field.itemLabel} ${index + 1}`;
}

/** Blocks the admin has hidden are kept in the draft but never rendered. */
export function isBlockHidden(item: Record<string, unknown>) {
  return item._hidden === true;
}
