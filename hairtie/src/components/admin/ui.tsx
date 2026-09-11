import Link from "next/link";

export function PageHeader({
  title,
  description,
  children,
  back,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-7">
      {back && (
        <Link href={back.href} className="mb-2 inline-block text-sm underline underline-offset-2" style={{ color: "var(--adm-muted)" }}>
          ← {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm" style={{ color: "var(--adm-muted)" }}>
              {description}
            </p>
          )}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function AdminPage({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-8">{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  href?: string;
}) {
  const body = (
    <div className="adm-card h-full p-5 transition hover:border-[var(--adm-accent)]">
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--adm-muted)" }}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-medium">{value}</p>
      {hint && (
        <p className="mt-1 text-xs" style={{ color: "var(--adm-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="adm-card px-6 py-16 text-center">
      <p className="text-lg font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: "var(--adm-muted)" }}>
        {description}
      </p>
      {action && <div className="mt-6 flex justify-center gap-3">{action}</div>}
    </div>
  );
}

export function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span className="adm-pill" style={{ background: bg, color }}>
      {label}
    </span>
  );
}

export function Pagination({
  page,
  pageCount,
  hrefFor,
}: {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Pagination">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className="adm-btn adm-btn-ghost adm-btn-sm">Previous</Link>
      ) : (
        <span />
      )}
      <span className="text-sm" style={{ color: "var(--adm-muted)" }}>
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className="adm-btn adm-btn-ghost adm-btn-sm">Next</Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="adm-card p-6">
      <h2 className="text-lg">{title}</h2>
      {description && (
        <p className="mt-1 text-sm" style={{ color: "var(--adm-muted)" }}>
          {description}
        </p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}
