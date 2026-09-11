import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mediaDriver } from "@/lib/storage";
import { AdminPage, PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/MediaPicker";

export default async function AdminMediaPage() {
  await requireAdmin();
  const count = await prisma.mediaAsset.count();
  const driver = mediaDriver();

  return (
    <AdminPage>
      <PageHeader
        title="Media"
        description={`${count} ${count === 1 ? "image" : "images"} in your library. Upload once and reuse anywhere — products, banners, categories.`}
      />

      {driver === "local" && (
        <div className="adm-card mb-5 p-4 text-sm" style={{ background: "var(--adm-accent-soft)", borderColor: "transparent" }}>
          <strong>Storage:</strong> images are saved on the server&apos;s own disk. That works on a normal
          server, but not on Vercel, whose disk is read-only. Before going live on Vercel, set
          <code className="mx-1 rounded px-1" style={{ background: "rgba(255,255,255,0.7)" }}>MEDIA_DRIVER=supabase</code>
          and add your Supabase storage keys.
        </div>
      )}

      <div className="adm-card p-6">
        <MediaLibrary />
      </div>
    </AdminPage>
  );
}
