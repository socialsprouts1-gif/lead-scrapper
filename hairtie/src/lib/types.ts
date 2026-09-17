/**
 * The Hairtie data model.
 *
 * The shop runs on a single JSON document rather than a database, so related
 * records (a product's images, an order's items) are embedded rather than
 * joined. All money is an integer number of paise — 1 rupee = 100 paise — which
 * keeps totals exact.
 */

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type ProductImage = {
  url: string;
  alt: string;
};

export type ProductVariant = {
  id: string;
  name: string;
  sku: string;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  price: number | null;
  mrp: number | null;
  stock: number;
  imageUrl: string | null;
  isActive: boolean;
};

export type ProductAttribute = {
  name: string;
  value: string;
  group: string;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand: string;
  shortDescription: string;
  description: string;
  categoryId: string | null;

  mrp: number;
  price: number;
  costPrice: number | null;

  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  allowBackorder: boolean;

  hsnCode: string | null;
  gstRate: number;
  priceIncludesTax: boolean;

  weightGrams: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  material: string | null;
  careInstructions: string | null;
  countryOfOrigin: string;
  videoUrl: string | null;

  isNewArrival: boolean;
  isBestseller: boolean;
  isTrending: boolean;
  isFeatured: boolean;
  isOnSale: boolean;

  status: ProductStatus;
  position: number;

  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;

  viewCount: number;
  salesCount: number;
  ratingSum: number;
  reviewCount: number;

  images: ProductImage[];
  variants: ProductVariant[];
  attributes: ProductAttribute[];
  tags: string[];

  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  parentId: string | null;
  position: number;
  isFeatured: boolean;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type CartItem = {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  savedForLater: boolean;
  addedAt: string;
};

export type Cart = {
  token: string;
  couponCode: string | null;
  items: CartItem[];
  updatedAt: string;
};

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED"
  | "REFUNDED";

export type PaymentStatus = "UNPAID" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
export type PaymentMethod = "COD" | "RAZORPAY";

export type OrderItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  name: string;
  sku: string;
  variantName: string | null;
  imageUrl: string | null;
  price: number;
  mrp: number;
  gstRate: number;
  hsnCode: string | null;
  quantity: number;
  lineTotal: number;
};

export type OrderEvent = {
  id: string;
  status: OrderStatus;
  message: string;
  createdBy: string;
  createdAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;

  customerName: string;
  customerEmail: string;
  customerPhone: string;

  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  shippingCountry: string;

  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  taxAmount: number;
  total: number;
  couponCode: string | null;

  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;

  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  refundId: string | null;
  refundAmount: number;

  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  customerNote: string | null;
  adminNote: string | null;

  placedAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;

  items: OrderItem[];
  events: OrderEvent[];
};

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export type Review = {
  id: string;
  productId: string;
  authorName: string;
  authorEmail: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  isVerified: boolean;
  createdAt: string;
};

export type DiscountType = "PERCENT" | "FIXED";
export type CouponScope = "ALL" | "PRODUCTS" | "CATEGORIES";

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: DiscountType;
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  scope: CouponScope;
  productIds: string[];
  categoryIds: string[];
  firstOrderOnly: boolean;
  usageLimit: number | null;
  perUserLimit: number;
  usageCount: number;
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type Section = {
  id: string;
  type: string;
  position: number;
  isHidden: boolean;
  settings: Record<string, unknown>;
};

export type Page = {
  id: string;
  slug: string;
  title: string;
  isSystem: boolean;
  isPublished: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  sections: Section[];
  /** The copy the public storefront renders. Publishing overwrites it. */
  publishedSnapshot: Section[] | null;
  hasDraftChanges: boolean;
  updatedAt: string;
};

export type Look = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  imageAlt: string;
  position: number;
  isActive: boolean;
  productIds: string[];
};

export type MediaAsset = {
  id: string;
  url: string;
  filename: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  sizeBytes: number;
  alt: string;
  folder: string;
  createdAt: string;
};

export type NewsletterSignup = {
  email: string;
  createdAt: string;
};
