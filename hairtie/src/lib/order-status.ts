/** Order status labels and colours — safe to import from client components. */

import type { OrderStatus } from "@/lib/types";

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
