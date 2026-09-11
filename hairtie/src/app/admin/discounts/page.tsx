import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { DiscountManager, type CouponRow } from "@/components/admin/DiscountManager";

export default async function AdminDiscountsPage() {
  await requireAdmin();

  const [coupons, categories] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({
      orderBy: [{ position: "asc" }],
      select: { id: true, name: true, parentId: true },
    }),
  ]);

  const rows: CouponRow[] = coupons.map((coupon) => ({
    id: coupon.id,
    code: coupon.code,
    description: coupon.description,
    type: coupon.type,
    value: coupon.value,
    minOrderValue: coupon.minOrderValue,
    maxDiscount: coupon.maxDiscount,
    scope: coupon.scope,
    categoryIds: coupon.categoryIds,
    productIds: coupon.productIds,
    firstOrderOnly: coupon.firstOrderOnly,
    usageLimit: coupon.usageLimit,
    perUserLimit: coupon.perUserLimit,
    usageCount: coupon.usageCount,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.toISOString() : null,
    isActive: coupon.isActive,
  }));

  return (
    <AdminPage>
      <PageHeader
        title="Discounts"
        description="Codes customers can enter at checkout. Switch one off at any time without deleting it."
      />
      <DiscountManager coupons={rows} categories={categories} />
    </AdminPage>
  );
}
