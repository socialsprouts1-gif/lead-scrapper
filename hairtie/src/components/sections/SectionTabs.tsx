"use client";

import { useState } from "react";

/**
 * The tab strip for the "Product tabs" section. Every panel is rendered on the
 * server and passed in as a child; this only decides which one is visible, so
 * the products are in the HTML whether or not JavaScript runs.
 */
export function SectionTabs({
  labels,
  children,
}: {
  labels: string[];
  children: React.ReactNode[];
}) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="ht-scroll-x mb-8 flex justify-start gap-1 md:justify-center" role="tablist">
        {labels.map((label, index) => (
          <button
            key={`${label}-${index}`}
            type="button"
            role="tab"
            aria-selected={active === index}
            onClick={() => setActive(index)}
            className="whitespace-nowrap rounded-full px-4 py-2 text-[0.82rem] transition"
            style={
              active === index
                ? { background: "var(--ht-text)", color: "var(--ht-bg)" }
                : { background: "var(--ht-surface)", color: "var(--ht-muted)" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {children.map((panel, index) => (
        <div key={index} role="tabpanel" hidden={active !== index}>
          {panel}
        </div>
      ))}
    </div>
  );
}
