import { store } from "@/lib/store";
import { allCategories } from "@/lib/catalog";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { DiscountManager, type CouponRow } from "@/components/admin/DiscountManager";

export default async function AdminDiscountsPage() {

  const rows: CouponRow[] = [...store().coupons]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((coupon) => ({ ...coupon }));
  const categories = allCategories();

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
