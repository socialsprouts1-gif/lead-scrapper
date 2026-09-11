/** Client-safe shop constants — importable from both server and browser code. */

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "popular", label: "Popular" },
  { value: "bestselling", label: "Best Selling" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
