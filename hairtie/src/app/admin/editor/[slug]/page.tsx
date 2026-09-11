import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getDraftPage } from "@/lib/pages";
import { WebsiteEditor, type EditorSection } from "@/components/admin/WebsiteEditor";

export default async function EditPageScreen(props: PageProps<"/admin/editor/[slug]">) {
  await requireAdmin();
  const { slug } = await props.params;

  const [draft, categories] = await Promise.all([
    getDraftPage(slug),
    prisma.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parentId: true },
    }),
  ]);

  if (!draft) notFound();

  const sections: EditorSection[] = draft.sections.map((section) => ({
    id: section.id,
    type: section.type,
    isHidden: section.isHidden,
    settings: (section.settings ?? {}) as Record<string, unknown>,
  }));

  return (
    <WebsiteEditor
      pageId={draft.page.id}
      slug={draft.page.slug}
      pageTitle={draft.page.title}
      sections={sections}
      hasDraftChanges={draft.page.hasDraftChanges}
      categories={categories}
    />
  );
}
