import { paymentView } from "@/lib/payments";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { PaymentsForm } from "@/components/admin/PaymentsForm";

/**
 * Only the redacted view crosses into the browser — `paymentView()` reports
 * whether a secret exists, never what it is.
 */
export default async function AdminPaymentsPage() {
  return (
    <AdminPage>
      <PageHeader
        title="Payments"
        description="Choose how customers may pay and connect your payment gateway. Your secret keys stay on the server and are never shown again once saved."
      />
      <PaymentsForm initial={paymentView()} />
    </AdminPage>
  );
}
