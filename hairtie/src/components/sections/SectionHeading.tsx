import Link from "next/link";

export function SectionHeading({
  heading,
  subheading,
  linkLabel,
  linkHref,
  align = "center",
}: {
  heading?: string;
  subheading?: string;
  linkLabel?: string;
  linkHref?: string;
  align?: "center" | "left";
}) {
  if (!heading && !subheading) return null;
  const centered = align === "center";

  return (
    <div
      className={`mb-8 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end ${
        centered ? "md:justify-center" : "md:justify-between"
      }`}
    >
      <div className={centered ? "text-center md:mx-auto md:max-w-2xl" : "max-w-2xl"}>
        {heading && <h2 className="text-[1.75rem] md:text-[2.35rem]">{heading}</h2>}
        {subheading && (
          <p className="mt-2 text-[0.95rem] leading-relaxed" style={{ color: "var(--ht-muted)" }}>
            {subheading}
          </p>
        )}
      </div>
      {linkLabel && linkHref && (
        <Link
          href={linkHref}
          className={`ht-underline shrink-0 text-[0.78rem] uppercase tracking-[0.14em] ${
            centered ? "hidden" : ""
          }`}
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
