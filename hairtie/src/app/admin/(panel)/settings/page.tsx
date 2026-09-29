import { getSiteSettings } from "@/lib/settings";
import { paymentView } from "@/lib/payments";
import { mediaDriver } from "@/lib/storage";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  const payments = paymentView();

  const integrations = [
    {
      name: "Online payments",
      ready: payments.onlineReady,
      readyNote: payments.testMode
        ? "Connected in test mode. Untick “test account” in Payments when you are ready for real orders."
        : "Connected. Customers can pay by UPI, card or net banking.",
      todo: "Add your gateway keys in Admin → Payments. Until then, checkout offers Cash on Delivery only.",
    },
    {
      name: "Image storage",
      ready: mediaDriver() === "supabase",
      readyNote: "Images go to Supabase Storage.",
      todo: "Images are saved on the server's own disk. That is fine on a normal server; on Vercel set MEDIA_DRIVER=supabase and add your Supabase keys.",
    },
    {
      name: "Google Analytics",
      ready: Boolean(settings.analytics.googleAnalyticsId),
      readyNote: `Tracking with ${settings.analytics.googleAnalyticsId}.`,
      todo: "Add your Google Analytics ID under the SEO & analytics tab to see visitor numbers.",
    },
  ];

  return (
    <AdminPage>
      <PageHeader
        title="Store settings"
        description="Your shop's details, contact numbers, shipping charges and SEO. Everything here is safe to change yourself."
      />

      <div className="adm-card mb-6 p-5">
        <h2 className="mb-3 text-base">Connections</h2>
        <ul className="space-y-3 text-sm">
          {integrations.map((integration) => (
            <li key={integration.name} className="flex items-start gap-3">
              <span
                className="mt-1 h-2 w-2 shrink-0 rounded-full"
                style={{ background: integration.ready ? "#3f8a4f" : "#c49a3f" }}
              />
              <div>
                <p className="font-medium">{integration.name}</p>
                <p style={{ color: "var(--adm-muted)" }}>
                  {integration.ready ? integration.readyNote : integration.todo}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <SettingsForm initial={settings} />
    </AdminPage>
  );
}
