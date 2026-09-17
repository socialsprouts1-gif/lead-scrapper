import { discountPercent, formatPaise } from "@/lib/money";
import { cn } from "@/lib/utils";

export function Price({
  price,
  mrp,
  size = "md",
  className,
}: {
  price: number;
  mrp?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const off = mrp ? discountPercent(mrp, price) : 0;
  const sizes = {
    sm: { price: "text-sm", mrp: "text-xs", off: "text-[0.65rem]" },
    md: { price: "text-base", mrp: "text-sm", off: "text-xs" },
    lg: { price: "text-2xl", mrp: "text-base", off: "text-sm" },
  }[size];

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn(sizes.price, "font-medium")}>{formatPaise(price)}</span>
      {off > 0 && (
        <>
          <span className={cn(sizes.mrp, "line-through")} style={{ color: "var(--ht-muted)" }}>
            {formatPaise(mrp!)}
          </span>
          <span className={cn(sizes.off, "font-semibold uppercase tracking-wide")} style={{ color: "#8a5a3c" }}>
            {off}% off
          </span>
        </>
      )}
    </span>
  );
}
