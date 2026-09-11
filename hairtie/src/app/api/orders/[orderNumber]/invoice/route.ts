import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSiteSettings } from "@/lib/settings";
import { formatPaise } from "@/lib/money";
import { formatDate } from "@/lib/utils";

/**
 * Invoices are served as a self-contained HTML document laid out for A4 with a
 * print stylesheet — the browser's "Save as PDF" turns it into a PDF. That
 * keeps a heavyweight PDF library (and its cold-start cost) out of the app.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[orderNumber]/invoice">) {
  const { orderNumber } = await ctx.params;

  const [order, settings, user] = await Promise.all([
    prisma.order.findUnique({ where: { orderNumber }, include: { items: true } }),
    getSiteSettings(),
    getCurrentUser(),
  ]);

  if (!order) return new Response("Order not found", { status: 404 });

  const staff = user?.role === "ADMIN" || user?.role === "STAFF";
  if (!staff && user && order.userId && order.userId !== user.id) {
    return new Response("Not found", { status: 404 });
  }

  const escape = (value: string) =>
    value.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
    );

  const rows = order.items
    .map(
      (item) => `<tr>
      <td>${escape(item.name)}${item.variantName ? `<br><span class="muted">${escape(item.variantName)}</span>` : ""}</td>
      <td>${escape(item.sku)}</td>
      <td>${item.hsnCode ? escape(item.hsnCode) : "—"}</td>
      <td class="right">${item.quantity}</td>
      <td class="right">${formatPaise(item.price)}</td>
      <td class="right">${item.gstRate}%</td>
      <td class="right">${formatPaise(item.lineTotal)}</td>
    </tr>`,
    )
    .join("");

  const storeAddress = [
    settings.store.addressLine1,
    settings.store.addressLine2,
    `${settings.store.city}, ${settings.store.state} ${settings.store.pincode}`,
  ]
    .filter(Boolean)
    .map(escape)
    .join("<br>");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice ${escape(order.orderNumber)} — ${escape(settings.storeName)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px; font: 13px/1.55 system-ui, -apple-system, "Segoe UI", sans-serif; color: #2f2925; background: #f6f3ee; }
  .sheet { max-width: 820px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 10px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .muted { color: #857b73; }
  .head { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; border-bottom: 1px solid #eae2d8; padding-bottom: 20px; margin-bottom: 24px; }
  .grid { display: flex; gap: 40px; flex-wrap: wrap; margin-bottom: 24px; }
  .grid > div { flex: 1 1 220px; }
  .label { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #857b73; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 9px 8px; text-align: left; border-bottom: 1px solid #eee7dd; vertical-align: top; }
  th { font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #857b73; }
  .right { text-align: right; }
  .totals { margin-top: 20px; margin-left: auto; width: 280px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
  .totals .grand { border-top: 1px solid #eae2d8; margin-top: 6px; padding-top: 10px; font-size: 16px; font-weight: 600; }
  .foot { margin-top: 32px; padding-top: 18px; border-top: 1px solid #eae2d8; font-size: 11px; color: #857b73; }
  .print { margin: 0 auto 20px; display: block; padding: 10px 20px; border: 1px solid #2f2925; background: #2f2925; color: #fff; border-radius: 999px; cursor: pointer; font: inherit; }
  @media print { body { background: #fff; padding: 0; } .sheet { padding: 0; } .print { display: none; } }
</style>
</head>
<body>
<button class="print" onclick="window.print()">Print / Save as PDF</button>
<div class="sheet">
  <div class="head">
    <div>
      <h1>${escape(settings.storeName)}</h1>
      <p class="muted" style="margin:0">${storeAddress}<br>${escape(settings.contact.phone)} · ${escape(settings.contact.email)}</p>
    </div>
    <div style="text-align:right">
      <div class="label">Tax invoice</div>
      <p style="margin:0"><strong>${escape(order.orderNumber)}</strong><br>
      <span class="muted">${escape(formatDate(order.placedAt, true))}</span></p>
    </div>
  </div>

  <div class="grid">
    <div>
      <div class="label">Billed to</div>
      ${escape(order.customerName)}<br>
      <span class="muted">${escape(order.shippingLine1)}<br>
      ${order.shippingLine2 ? `${escape(order.shippingLine2)}<br>` : ""}
      ${escape(order.shippingCity)}, ${escape(order.shippingState)} ${escape(order.shippingPincode)}<br>
      ${escape(order.customerPhone)} · ${escape(order.customerEmail)}</span>
    </div>
    <div>
      <div class="label">Payment</div>
      ${order.paymentMethod === "COD" ? "Cash on Delivery" : "Paid online"}<br>
      <span class="muted">Status: ${escape(order.paymentStatus)}<br>
      ${order.razorpayPaymentId ? `Ref: ${escape(order.razorpayPaymentId)}` : ""}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Item</th><th>SKU</th><th>HSN</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">GST</th><th class="right">Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span class="muted">Subtotal</span><span>${formatPaise(order.subtotal)}</span></div>
    ${order.discountAmount > 0 ? `<div><span class="muted">Discount${order.couponCode ? ` (${escape(order.couponCode)})` : ""}</span><span>− ${formatPaise(order.discountAmount)}</span></div>` : ""}
    <div><span class="muted">Shipping</span><span>${order.shippingFee === 0 ? "Free" : formatPaise(order.shippingFee)}</span></div>
    <div class="grand"><span>Total</span><span>${formatPaise(order.total)}</span></div>
    <div><span class="muted">Includes GST</span><span class="muted">${formatPaise(order.taxAmount)}</span></div>
  </div>

  <div class="foot">
    All prices are in Indian Rupees and inclusive of GST. This is a computer-generated invoice and does not require a signature.
    ${settings.seo.siteUrl ? `<br>${escape(settings.seo.siteUrl)}` : ""}
  </div>
</div>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
