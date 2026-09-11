import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { getTheme } from "@/lib/settings";
import { AppearanceEditor } from "@/components/admin/AppearanceEditor";

export default async function AdminAppearancePage() {
  await requireAdmin();
  const [theme, row] = await Promise.all([
    getTheme({ draft: true }),
    prisma.themeSetting.findUnique({ where: { id: "singleton" }, select: { draft: true } }),
  ]);

  return <AppearanceEditor initial={theme} hasDraft={Boolean(row?.draft)} />;
}
