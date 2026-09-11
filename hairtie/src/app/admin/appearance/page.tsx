
import { getTheme, hasThemeDraft } from "@/lib/settings";
import { AppearanceEditor } from "@/components/admin/AppearanceEditor";

export default async function AdminAppearancePage() {
  return <AppearanceEditor initial={getTheme({ draft: true })} hasDraft={hasThemeDraft()} />;
}
