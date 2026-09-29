import { isAdminSignedIn } from "@/lib/admin-auth";
import { toCsv, csvResponse } from "@/lib/csv";
import { allOrders, customerSummaries } from "@/lib/orders";
import { allProducts, categoryById } from "@/lib/catalog";
import { allCustomerProfiles } from "@/lib/customers";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";

/**
 * Spreadsheet exports for the admin's "Export CSV" buttons. Amounts are written
 * in rupees so the file opens as money rather than paise.
 */
const rupees = (paise: number) => (paise / 100).toFixed(2);

export async function GET(_request: Request, context: RouteContext<"/api/admin/export/[kind]">) {
  if (!(await isAdminSignedIn())) {
    return new Response("Not signed in.", { status: 401 });
  }

  const { kind } = await context.params;
  const stamp = new Date().toISOString().slice(0, 10);

  if (kind === "orders") {
    const rows = allOrders().map((order) => [
      order.orderNumber,
      order.placedAt,
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      [order.shippingLine1, order.shippingLine2, order.shippingCity, order.shippingState, order.shippingPincode]
        .filter(Boolean)
        .join(", "),
      order.items.length,
      order.items.map((item) => `${item.quantity}× ${item.name}`).join(" | "),
      rupees(order.subtotal),
      rupees(order.discountAmount),
      rupees(order.shippingFee),
      rupees(order.codFee),
      rupees(order.total),
      order.couponCode ?? "",
      order.paymentMethod,
      order.paymentStatus,
      ORDER_STATUS_LABELS[order.status],
      order.courierName ?? "",
      order.trackingNumber ?? "",
    ]);

    return csvResponse(
      `hairtie-orders-${stamp}.csv`,
      toCsv(
        [
          "Order", "Placed at", "Customer", "Email", "Phone", "Address", "Items", "Contents",
          "Subtotal", "Discount", "Shipping", "COD charge", "Total", "Coupon", "Payment method",
          "Payment status", "Order status", "Courier", "Tracking number",
        ],
        rows,
      ),
    );
  }

  if (kind === "customers") {
    const profiles = new Map(allCustomerProfiles().map((profile) => [profile.email, profile]));
    const rows = customerSummaries().map((customer) => {
      const profile = profiles.get(customer.key);
      return [
        customer.name,
        customer.email,
        customer.phone,
        customer.orderCount,
        rupees(customer.totalSpent),
        customer.firstOrderAt ?? "",
        customer.lastOrderAt ?? "",
        profile?.tags.join(" | ") ?? "",
        profile?.note ?? "",
        profile?.isBlocked ? "Blocked" : "",
      ];
    });

    return csvResponse(
      `hairtie-customers-${stamp}.csv`,
      toCsv(
        ["Name", "Email", "Phone", "Orders", "Total spent", "First order", "Last order", "Tags", "Note", "Status"],
        rows,
      ),
    );
  }

  if (kind === "products") {
    const rows = allProducts().map((product) => [
      product.name,
      product.sku,
      product.slug,
      product.categoryId ? (categoryById(product.categoryId)?.name ?? "") : "",
      rupees(product.price),
      rupees(product.mrp),
      product.stock,
      product.trackInventory ? "Yes" : "No",
      product.status,
      product.salesCount,
      product.variants.length,
      product.tags.join(" | "),
      product.createdAt,
    ]);

    return csvResponse(
      `hairtie-products-${stamp}.csv`,
      toCsv(
        [
          "Name", "SKU", "Slug", "Category", "Price", "MRP", "Stock", "Tracks inventory",
          "Status", "Units sold", "Variants", "Tags", "Created",
        ],
        rows,
      ),
    );
  }

  return new Response("Unknown export.", { status: 404 });
}
