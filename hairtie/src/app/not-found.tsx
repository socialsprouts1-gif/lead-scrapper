import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: "var(--ht-bg)", color: "var(--ht-text)" }}
    >
      <p className="ht-eyebrow">404</p>
      <h1 className="mt-3 font-serif text-[2.4rem] md:text-[3rem]">We can&apos;t find that page</h1>
      <p className="mt-3 max-w-sm text-[0.98rem]" style={{ color: "var(--ht-muted)" }}>
        It may have moved, or the link might be a little out of date.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="ht-btn ht-btn-primary">Back to home</Link>
        <Link href="/shop" className="ht-btn ht-btn-outline">Browse the shop</Link>
      </div>
    </div>
  );
}
