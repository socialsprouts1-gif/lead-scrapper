import Link from "next/link";
import { allPages } from "@/lib/pages";
import { formatDate } from "@/lib/utils";
import { AdminPage, PageHeader, Pill } from "@/components/admin/ui";
import { PageListActions } from "@/components/admin/PageListActions";

export default async function AdminEditorPage() {

  const pages = allPages();

  const home = pages.find((page) => page.slug === "home");
  const rest = pages.filter((page) => page.slug !== "home");

  return (
    <AdminPage>
      <PageHeader
        title="Website editor"
        description="Change what's on your pages — banners, text, which products show where. Nothing goes live until you press Publish."
      >
        <PageListActions />
      </PageHeader>

      {home && (
        <Link
          href={`/admin/editor/${home.slug}`}
          className="adm-card mb-5 flex flex-wrap items-center justify-between gap-4 p-6 transition hover:border-[var(--adm-accent)]"
        >
          <div>
            <p className="text-lg">Homepage</p>
            <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>
              {home.sections.length} sections · last changed {formatDate(home.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {home.hasDraftChanges && <Pill label="Unpublished changes" bg="#f3ece2" color="#8a6b3c" />}
            <span className="adm-btn adm-btn-primary">Edit homepage</span>
          </div>
        </Link>
      )}

      <div className="adm-card">
        <div className="adm-scroll">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Address</th>
                <th>Sections</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rest.map((page) => (
                <tr key={page.id}>
                  <td>
                    <Link href={`/admin/editor/${page.slug}`} className="font-medium underline underline-offset-2">
                      {page.title}
                    </Link>
                  </td>
                  <td style={{ color: "var(--adm-muted)" }}>/{page.slug}</td>
                  <td>{page.sections.length}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      {page.isPublished ? (
                        <Pill label="Live" bg="#e4f0e6" color="#356b40" />
                      ) : (
                        <Pill label="Not published" bg="#eeeae5" color="#6b6058" />
                      )}
                      {page.hasDraftChanges && <Pill label="Unpublished changes" bg="#f3ece2" color="#8a6b3c" />}
                    </div>
                  </td>
                  <td className="text-right">
                    <Link href={`/admin/editor/${page.slug}`} className="adm-btn adm-btn-ghost adm-btn-sm">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card mt-5 p-5 text-sm">
        <h2 className="mb-2 text-base">How this works</h2>
        <ol className="list-decimal space-y-1.5 pl-5" style={{ color: "var(--adm-muted)" }}>
          <li>Open a page and click any section — in the list on the left, or straight on the preview.</li>
          <li>Change the words, pictures and buttons. Your edits save as you type.</li>
          <li>Nothing your customers see changes until you press <strong>Publish changes</strong>.</li>
          <li>Changed your mind? <strong>Discard</strong> puts the page back to how it was published.</li>
        </ol>
      </div>
    </AdminPage>
  );
}
