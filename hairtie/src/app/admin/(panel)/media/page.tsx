import { isPersistent } from "@/lib/store";
import { listMedia } from "@/lib/media";
import { mediaDriver } from "@/lib/storage";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/MediaPicker";

export default async function AdminMediaPage() {
  const count = listMedia().length;
  const driver = mediaDriver();
  const writable = isPersistent();

  return (
    <AdminPage>
      <PageHeader
        title="Media"
        description={`${count} ${count === 1 ? "image" : "images"} in your library. Upload once and reuse anywhere — products, banners, categories.`}
      />

      {driver === "local" && !writable && (
        <div className="adm-card mb-5 p-4 text-sm" style={{ background: "var(--adm-accent-soft)", borderColor: "transparent" }}>
          <strong>Uploads won&apos;t stick on this host.</strong> Its filesystem is read-only, so new
          images are lost when the server restarts. To upload permanently, run the shop on a normal
          server, or set
          <code className="mx-1 rounded px-1" style={{ background: "rgba(255,255,255,0.7)" }}>MEDIA_DRIVER=supabase</code>
          with your Supabase storage keys.
        </div>
      )}

      <div className="adm-card p-6">
        <MediaLibrary />
      </div>
    </AdminPage>
  );
}
