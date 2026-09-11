import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { OrderStatus } from "@/generated/prisma/enums";
import { computeTotals, evaluateCoupon, lineMrp, linePrice, type CartWithItems } from "@/lib/cart";
import { getSiteSettings } from "@/lib/settings";

export function generateOrderNumber() {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  // Six random characters (~2 billion per day) so that an order number is not
  // guessable — guest customers open their order using this number alone.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  const random = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `HT${stamp}${random}`;
}

export type CheckoutDetails = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingLine1: string;
  shippingLine2?: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPincode: string;
  customerNote?: string | null;
  paymentMethod: "COD" | "RAZORPAY";
};

export type StockProblem = { name: string; available: number };

/** Verifies every line is still purchasable before an order is written. */
export function findStockProblems(cart: CartWithItems): StockProblem[] {
  const problems: StockProblem[] = [];
  for (const line of cart.items) {
    if (line.savedForLater) continue;
    if (line.product.status !== "ACTIVE") {
      problems.push({ name: line.product.name, available: 0 });
      continue;
    }
    if (!line.product.trackInventory || line.product.allowBackorder) continue;
    const available = line.variant ? line.variant.stock : line.product.stock;
    if (line.quantity > available) problems.push({ name: line.product.name, available });
  }
  return problems;
}

/**
 * Creates an order from the cart. Totals are recomputed on the server from the
 * database — the browser never gets to decide what anything costs.
 */
export async function createOrderFromCart(
  cart: CartWithItems,
  details: CheckoutDetails,
  userId: string | null,
) {
  const settings = await getSiteSettings();
  const totals = await computeTotals(cart, settings);
  const lines = cart.items.filter((line) => !line.savedForLater);

  if (lines.length === 0) throw new Error("Your bag is empty.");
  if (details.paymentMethod === "COD" && !settings.shipping.codEnabled) {
    throw new Error("Cash on Delivery is not available right now.");
  }

  const couponCode = totals.couponCode;
  const orderNumber = generateOrderNumber();

  const order = await prisma.$transaction(async (tx) => {
    // Re-read stock inside the transaction so two simultaneous checkouts of the
    // last item cannot both succeed.
    for (const line of lines) {
      if (!line.product.trackInventory || line.product.allowBackorder) continue;
      if (line.variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: line.variantId },
          select: { stock: true },
        });
        if (!variant || variant.stock < line.quantity) {
          throw new Error(`${line.product.name} just sold out. Please review your bag.`);
        }
      } else {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
          select: { stock: true },
        });
        if (!product || product.stock < line.quantity) {
          throw new Error(`${line.product.name} just sold out. Please review your bag.`);
        }
      }
    }

    const created = await tx.order.create({
      data: {
        orderNumber,
        userId,
        customerName: details.customerName,
        customerEmail: details.customerEmail.toLowerCase(),
        customerPhone: details.customerPhone,
        shippingLine1: details.shippingLine1,
        shippingLine2: details.shippingLine2 || null,
        shippingCity: details.shippingCity,
        shippingState: details.shippingState,
        shippingPincode: details.shippingPincode,
        customerNote: details.customerNote || null,
        subtotal: totals.subtotal,
        discountAmount: totals.discount,
        shippingFee: totals.shippingFee,
        taxAmount: totals.taxIncluded,
        total: totals.total,
        couponCode,
        paymentMethod: details.paymentMethod,
        status: "PENDING",
        paymentStatus: "UNPAID",
        items: {
          create: lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            name: line.product.name,
            sku: line.variant?.sku ?? line.product.sku,
            variantName: line.variant?.name ?? null,
            imageUrl: line.variant?.imageUrl ?? line.product.images[0]?.url ?? null,
            price: linePrice(line),
            mrp: lineMrp(line),
            gstRate: line.product.gstRate,
            hsnCode: line.product.hsnCode,
            quantity: line.quantity,
            lineTotal: linePrice(line) * line.quantity,
          })),
        },
        events: {
          create: {
            status: "PENDING",
            message:
              details.paymentMethod === "COD"
                ? "Order placed with Cash on Delivery."
                : "Order placed, awaiting payment.",
            createdBy: "system",
          },
        },
      },
    });

    for (const line of lines) {
      if (line.product.trackInventory) {
        if (line.variantId) {
          await tx.productVariant.update({
            where: { id: line.variantId },
            data: { stock: { decrement: line.quantity } },
          });
        }
        await tx.product.update({
          where: { id: line.productId },
          data: {
            stock: { decrement: line.variantId ? 0 : line.quantity },
            salesCount: { increment: line.quantity },
          },
        });
      } else {
        await tx.product.update({
          where: { id: line.productId },
          data: { salesCount: { increment: line.quantity } },
        });
      }
    }

    if (couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: couponCode } });
      if (coupon) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usageCount: { increment: 1 } } });
        await tx.couponRedemption.create({
          data: {
            couponId: coupon.id,
            userId,
            orderId: created.id,
            email: details.customerEmail.toLowerCase(),
            amount: totals.discount,
          },
        });
      }
    }

    // The bag is emptied here; saved-for-later items are deliberately kept.
    await tx.cartItem.deleteMany({ where: { cartId: cart.id, savedForLater: false } });
    await tx.cart.update({ where: { id: cart.id }, data: { couponCode: null } });

    return created;
  });

  return order;
}

/** Puts stock back when an order is cancelled or returned. */
export async function restoreStock(orderId: string, tx?: Prisma.TransactionClient) {
  const client = tx ?? prisma;
  const items = await client.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    if (item.variantId) {
      await client.productVariant
        .update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } })
        .catch(() => {});
    } else if (item.productId) {
      await client.product
        .update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } })
        .catch(() => {});
    }
    if (item.productId) {
      await client.product
        .update({ where: { id: item.productId }, data: { salesCount: { decrement: item.quantity } } })
        .catch(() => {});
    }
  }
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  REFUNDED: "Refunded",
};

export const ORDER_STATUS_TONE: Record<OrderStatus, { bg: string; color: string }> = {
  PENDING: { bg: "#f3ece2", color: "#8a6b3c" },
  CONFIRMED: { bg: "#e8f0ea", color: "#3f6b4c" },
  PROCESSING: { bg: "#e9edf5", color: "#41567f" },
  SHIPPED: { bg: "#e6eef4", color: "#356179" },
  DELIVERED: { bg: "#e4f0e6", color: "#356b40" },
  CANCELLED: { bg: "#f6e7e7", color: "#8a3c3c" },
  RETURNED: { bg: "#f2ebf3", color: "#6b4079" },
  REFUNDED: { bg: "#eeeae5", color: "#6b6058" },
};

/** Records a status change and applies its side effects. */
export async function changeOrderStatus(
  orderId: string,
  status: OrderStatus,
  actor: string,
  message?: string,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Order not found.");
  if (order.status === status) return order;

  const timestamps: Partial<Record<OrderStatus, Record<string, Date>>> = {
    CONFIRMED: { confirmedAt: new Date() },
    SHIPPED: { shippedAt: new Date() },
    DELIVERED: { deliveredAt: new Date() },
    CANCELLED: { cancelledAt: new Date() },
  };

  const shouldRestoreStock =
    (status === "CANCELLED" || status === "RETURNED") &&
    !["CANCELLED", "RETURNED"].includes(order.status);

  if (shouldRestoreStock) await restoreStock(orderId);

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(timestamps[status] ?? {}),
      ...(status === "DELIVERED" && order.paymentMethod === "COD" && order.paymentStatus === "UNPAID"
        ? { paymentStatus: "PAID" as const }
        : {}),
      events: {
        create: {
          status,
          message: message || `Status changed to ${ORDER_STATUS_LABELS[status]}.`,
          createdBy: actor,
        },
      },
    },
  });
}

export async function recomputeCouponUsage(code: string) {
  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return;
  const count = await prisma.couponRedemption.count({ where: { couponId: coupon.id } });
  await prisma.coupon.update({ where: { id: coupon.id }, data: { usageCount: count } });
}

export { evaluateCoupon };
