import { notFound } from "next/navigation";
import { allCategories } from "@/lib/catalog";
import { allPages, getDraftPage } from "@/lib/pages";
import { WebsiteEditor, type EditorSection } from "@/components/admin/WebsiteEditor";

export default async function EditPageScreen(props: PageProps<"/admin/editor/[slug]">) {
  const { slug } = await props.params;

  const draft = getDraftPage(slug);
  const categories = allCategories();
  const pages = allPages().map((page) => ({
    slug: page.slug,
    title: page.title,
    isPublished: page.isPublished,
  }));

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
      pages={pages}
      sections={sections}
      hasDraftChanges={draft.page.hasDraftChanges}
      categories={categories}
    />
  );
}
