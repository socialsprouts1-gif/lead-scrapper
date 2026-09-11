import "server-only";
import { randomBytes } from "node:crypto";
import { createId, mutate, now, store } from "@/lib/store";
import { productById } from "@/lib/catalog";
import { computeTotals, lineMrp, linePrice, type ResolvedCart } from "@/lib/cart";
import { getSiteSettings } from "@/lib/settings";
import type { Order, OrderStatus } from "@/lib/types";

export {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONE,
} from "@/lib/order-status";

import { ORDER_STATUS_LABELS } from "@/lib/order-status";

export function generateOrderNumber() {
  const date = new Date();
  const stamp = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate(),
  ).padStart(2, "0")}`;
  // Six random characters, so an order number is not guessable — customers open
  // their order with this number alone.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  const random = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return `HT${stamp}${random}`;
}

export function orderByNumber(orderNumber: string) {
  return store().orders.find((order) => order.orderNumber === orderNumber) ?? null;
}

export function orderById(id: string) {
  return store().orders.find((order) => order.id === id) ?? null;
}

export function allOrders() {
  return [...store().orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
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
export function findStockProblems(resolved: ResolvedCart): StockProblem[] {
  const problems: StockProblem[] = [];
  for (const line of resolved.lines) {
    if (line.item.savedForLater) continue;
    if (line.product.status !== "ACTIVE") {
      problems.push({ name: line.product.name, available: 0 });
      continue;
    }
    if (!line.product.trackInventory || line.product.allowBackorder) continue;
    const available = line.variant ? line.variant.stock : line.product.stock;
    if (line.item.quantity > available) problems.push({ name: line.product.name, available });
  }
  return problems;
}

/**
 * Creates an order from the cart. Totals are recomputed here from the stored
 * catalogue — the browser never gets to decide what anything costs.
 */
export function createOrderFromCart(resolved: ResolvedCart, details: CheckoutDetails): Order {
  const settings = getSiteSettings();
  const totals = computeTotals(resolved, settings);
  const lines = resolved.lines.filter((line) => !line.item.savedForLater);

  if (lines.length === 0) throw new Error("Your bag is empty.");
  if (details.paymentMethod === "COD" && !settings.shipping.codEnabled) {
    throw new Error("Cash on Delivery is not available right now.");
  }

  const problems = findStockProblems(resolved);
  if (problems.length > 0) {
    const first = problems[0];
    throw new Error(
      first.available === 0
        ? `${first.name} just sold out. Please review your bag.`
        : `Only ${first.available} of ${first.name} left. Please reduce the quantity.`,
    );
  }

  const timestamp = now();
  const order: Order = {
    id: createId("ord"),
    orderNumber: generateOrderNumber(),

    customerName: details.customerName,
    customerEmail: details.customerEmail.toLowerCase(),
    customerPhone: details.customerPhone,

    shippingLine1: details.shippingLine1,
    shippingLine2: details.shippingLine2 || null,
    shippingCity: details.shippingCity,
    shippingState: details.shippingState,
    shippingPincode: details.shippingPincode,
    shippingCountry: "India",

    subtotal: totals.subtotal,
    discountAmount: totals.discount,
    shippingFee: totals.shippingFee,
    taxAmount: totals.taxIncluded,
    total: totals.total,
    couponCode: totals.couponCode,

    status: "PENDING",
    paymentStatus: "UNPAID",
    paymentMethod: details.paymentMethod,

    razorpayOrderId: null,
    razorpayPaymentId: null,
    refundId: null,
    refundAmount: 0,

    courierName: null,
    trackingNumber: null,
    trackingUrl: null,
    customerNote: details.customerNote || null,
    adminNote: null,

    placedAt: timestamp,
    confirmedAt: null,
    shippedAt: null,
    deliveredAt: null,
    cancelledAt: null,

    items: lines.map((line) => ({
      id: createId("oi"),
      productId: line.product.id,
      variantId: line.variant?.id ?? null,
      name: line.product.name,
      sku: line.variant?.sku ?? line.product.sku,
      variantName: line.variant?.name ?? null,
      imageUrl: line.variant?.imageUrl ?? line.product.images[0]?.url ?? null,
      price: linePrice(line),
      mrp: lineMrp(line),
      gstRate: line.product.gstRate,
      hsnCode: line.product.hsnCode,
      quantity: line.item.quantity,
      lineTotal: linePrice(line) * line.item.quantity,
    })),
    events: [
      {
        id: createId("oe"),
        status: "PENDING",
        message:
          details.paymentMethod === "COD"
            ? "Order placed with Cash on Delivery."
            : "Order placed, awaiting payment.",
        createdBy: "system",
        createdAt: timestamp,
      },
    ],
  };

  mutate((data) => {
    data.orders.push(order);

    // Take the stock out of inventory.
    for (const line of lines) {
      const product = data.products.find((entry) => entry.id === line.product.id);
      if (!product) continue;
      product.salesCount += line.item.quantity;
      if (!product.trackInventory) continue;
      if (line.variant) {
        const variant = product.variants.find((entry) => entry.id === line.variant!.id);
        if (variant) variant.stock = Math.max(0, variant.stock - line.item.quantity);
      } else {
        product.stock = Math.max(0, product.stock - line.item.quantity);
      }
    }

    if (order.couponCode) {
      const coupon = data.coupons.find((entry) => entry.code === order.couponCode);
      if (coupon) coupon.usageCount += 1;
    }

    // Empty the bag; saved-for-later items are deliberately kept.
    const cart = data.carts.find((entry) => entry.token === resolved.cart.token);
    if (cart) {
      cart.items = cart.items.filter((item) => item.savedForLater);
      cart.couponCode = null;
      cart.updatedAt = timestamp;
    }
  });

  return order;
}

/** Puts stock back when an order is cancelled or returned. */
function restoreStock(order: Order) {
  for (const item of order.items) {
    if (!item.productId) continue;
    const product = productById(item.productId);
    if (!product) continue;
    product.salesCount = Math.max(0, product.salesCount - item.quantity);
    if (!product.trackInventory) continue;
    if (item.variantId) {
      const variant = product.variants.find((entry) => entry.id === item.variantId);
      if (variant) variant.stock += item.quantity;
    } else {
      product.stock += item.quantity;
    }
  }
}

/** Records a status change and applies its side effects. */
export function changeOrderStatus(
  orderId: string,
  status: OrderStatus,
  actor: string,
  message?: string,
) {
  return mutate((data) => {
    const order = data.orders.find((entry) => entry.id === orderId);
    if (!order) throw new Error("Order not found.");
    if (order.status === status) return order;

    const wasOpen = !["CANCELLED", "RETURNED"].includes(order.status);
    if ((status === "CANCELLED" || status === "RETURNED") && wasOpen) restoreStock(order);

    const timestamp = now();
    order.status = status;
    if (status === "CONFIRMED") order.confirmedAt = timestamp;
    if (status === "SHIPPED") order.shippedAt = timestamp;
    if (status === "DELIVERED") order.deliveredAt = timestamp;
    if (status === "CANCELLED") order.cancelledAt = timestamp;

    // A delivered COD order has been paid for, by definition.
    if (status === "DELIVERED" && order.paymentMethod === "COD" && order.paymentStatus === "UNPAID") {
      order.paymentStatus = "PAID";
    }

    order.events.push({
      id: createId("oe"),
      status,
      message: message || `Status changed to ${ORDER_STATUS_LABELS[status]}.`,
      createdBy: actor,
      createdAt: timestamp,
    });

    return order;
  });
}

export function addOrderEvent(orderId: string, status: OrderStatus, message: string, actor: string) {
  mutate((data) => {
    const order = data.orders.find((entry) => entry.id === orderId);
    if (!order) return;
    order.events.push({
      id: createId("oe"),
      status,
      message,
      createdBy: actor,
      createdAt: now(),
    });
  });
}

export function cancelUnpaidOrder(orderNumber: string) {
  mutate((data) => {
    const order = data.orders.find((entry) => entry.orderNumber === orderNumber);
    if (!order || order.paymentStatus === "PAID") return;
    restoreStock(order);
    order.status = "CANCELLED";
    order.cancelledAt = now();
    order.paymentStatus = "FAILED";
    order.events.push({
      id: createId("oe"),
      status: "CANCELLED",
      message: "Payment was not completed.",
      createdBy: "system",
      createdAt: now(),
    });
  });
}

/**
 * Customers are derived from their orders rather than stored separately —
 * there are no accounts, so an email address is the identity.
 */
export type CustomerSummary = {
  key: string;
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  firstOrderAt: string | null;
  orders: Order[];
};

export function customerSummaries(): CustomerSummary[] {
  const map = new Map<string, CustomerSummary>();

  for (const order of allOrders()) {
    const key = order.customerEmail.toLowerCase();
    const existing = map.get(key);
    const counts = order.status !== "CANCELLED";

    if (existing) {
      existing.orders.push(order);
      if (counts) {
        existing.orderCount += 1;
        existing.totalSpent += order.total;
      }
      if (!existing.lastOrderAt || order.placedAt > existing.lastOrderAt) {
        existing.lastOrderAt = order.placedAt;
        existing.name = order.customerName;
        existing.phone = order.customerPhone;
      }
      if (!existing.firstOrderAt || order.placedAt < existing.firstOrderAt) {
        existing.firstOrderAt = order.placedAt;
      }
    } else {
      map.set(key, {
        key,
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        orderCount: counts ? 1 : 0,
        totalSpent: counts ? order.total : 0,
        lastOrderAt: order.placedAt,
        firstOrderAt: order.placedAt,
        orders: [order],
      });
    }
  }

  return [...map.values()].sort((a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""));
}

export function customerByKey(key: string) {
  return customerSummaries().find((customer) => customer.key === key) ?? null;
}
