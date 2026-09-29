/**
 * All money in Hairtie is stored as an integer number of paise.
 * 1 rupee = 100 paise. This avoids floating point rounding errors on totals.
 */

export function formatPaise(paise: number, opts: { decimals?: boolean } = {}) {
  const rupees = paise / 100;
  const showDecimals = opts.decimals ?? !Number.isInteger(rupees);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(rupees);
}

/** Plain number of rupees, for JSON-LD and feeds where a symbol is wrong. */
export function paiseToRupees(paise: number) {
  return Number((paise / 100).toFixed(2));
}

export function rupeesToPaise(rupees: number | string) {
  const value = typeof rupees === "string" ? Number(rupees) : rupees;
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function discountPercent(mrp: number, price: number) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}
