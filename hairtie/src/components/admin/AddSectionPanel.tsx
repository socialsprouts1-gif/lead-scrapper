"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { SECTION_GROUPS, SECTION_REGISTRY, type SectionGroup } from "@/lib/sections";

/**
 * The "Add a section" picker: searchable, grouped by what the section is for,
 * and told where in the page the new section will land.
 */
export function AddSectionPanel({
  positionLabel,
  onPick,
  onClose,
}: {
  positionLabel: string;
  onPick: (type: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<SectionGroup | "All">("All");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SECTION_REGISTRY.filter((entry) => {
      if (group !== "All" && entry.group !== group) return false;
      if (!needle) return true;
      return `${entry.label} ${entry.description} ${entry.group}`.toLowerCase().includes(needle);
    });
  }, [query, group]);

  return (
    <div
      className="fixed inset-0 z-[85] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Add a section"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        style={{ background: "rgba(46,42,38,0.5)" }}
        onClick={onClose}
      />

      <div
        className="relative flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl"
        style={{ background: "var(--adm-surface)" }}
      >
        <div className="flex items-start justify-between gap-4 border-b p-5" style={{ borderColor: "var(--adm-line)" }}>
          <div>
            <h2 className="text-lg">Add a section</h2>
            <p className="text-sm" style={{ color: "var(--adm-muted)" }}>
              {positionLabel}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="border-b px-5 py-3" style={{ borderColor: "var(--adm-line)" }}>
          <div className="relative">
            <Search
              size={15}
              strokeWidth={1.8}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--adm-muted)" }}
            />
            <input
              className="adm-input pl-9"
              placeholder="Search sections…"
              value={query}
              aria-label="Search sections"
              autoFocus
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["All", ...SECTION_GROUPS] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setGroup(entry)}
                aria-pressed={group === entry}
                className="rounded-full px-3 py-1 text-xs transition"
                style={
                  group === entry
                    ? { background: "var(--adm-text)", color: "var(--adm-surface)" }
                    : { background: "var(--adm-bg)", color: "var(--adm-muted)" }
                }
              >
                {entry}
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {results.length === 0 ? (
            <p className="py-10 text-center text-sm" style={{ color: "var(--adm-muted)" }}>
              Nothing matches “{query}”.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {results.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  className="flex items-start gap-3 rounded-xl p-3 text-left transition hover:border-[var(--adm-accent)]"
                  style={{ border: "1px solid var(--adm-line)" }}
                  onClick={() => onPick(entry.type)}
                >
                  <span className="text-xl leading-none">{entry.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{entry.label}</span>
                    <span className="block text-xs" style={{ color: "var(--adm-muted)" }}>
                      {entry.description}
                    </span>
                    <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[0.62rem] uppercase tracking-wide" style={{ background: "var(--adm-bg)", color: "var(--adm-muted)" }}>
                      {entry.group}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
