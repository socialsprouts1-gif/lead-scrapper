"use client";

import { useEffect } from "react";

/**
 * Runs inside the website editor's preview iframe and talks to the editor over
 * postMessage, so selecting and hovering never needs a page reload:
 *
 *   preview → editor   select / hover   (the admin clicked or pointed at a section)
 *   editor  → preview  select / hover / scrollTo   (the admin used the sidebar)
 *
 * It also blocks ordinary link navigation, so the preview always stays on the
 * page being edited.
 */
const SOURCE = "hairtie-preview";
const HOVER_RING = "inset 0 0 0 2px color-mix(in srgb, var(--ht-primary) 45%, transparent)";
const SELECTED_RING = "inset 0 0 0 2px var(--ht-primary)";

export function PreviewBridge() {
  useEffect(() => {
    let selectedId: string | null = null;
    let hoverId: string | null = null;

    const badge = document.createElement("div");
    badge.setAttribute("aria-hidden", "true");
    Object.assign(badge.style, {
      position: "absolute",
      top: "0",
      left: "0",
      zIndex: "40",
      padding: "3px 9px",
      borderRadius: "0 0 8px 0",
      font: "500 11px/1.4 system-ui, sans-serif",
      letterSpacing: "0.04em",
      background: "var(--ht-primary)",
      color: "#fff",
      pointerEvents: "none",
      whiteSpace: "nowrap",
    } satisfies Partial<CSSStyleDeclaration>);

    function sections() {
      return Array.from(document.querySelectorAll<HTMLElement>("[data-section-id]"));
    }

    function find(id: string | null) {
      if (!id) return null;
      return document.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(id)}"]`);
    }

    function paint() {
      for (const element of sections()) {
        const id = element.dataset.sectionId;
        element.style.cursor = "pointer";
        element.style.outline = "";
        if (id === selectedId) {
          element.style.boxShadow = SELECTED_RING;
        } else if (id === hoverId) {
          element.style.boxShadow = HOVER_RING;
        } else {
          element.style.boxShadow = "";
        }
      }

      const active = find(selectedId) ?? find(hoverId);
      if (!active) {
        badge.remove();
        return;
      }
      badge.textContent = active.dataset.sectionLabel || "Section";
      badge.style.background =
        active.dataset.sectionId === selectedId ? "var(--ht-primary)" : "rgba(47,41,37,0.8)";
      if (badge.parentElement !== active) active.appendChild(badge);
    }

    function post(message: Record<string, unknown>) {
      window.parent?.postMessage({ source: SOURCE, ...message }, window.location.origin);
    }

    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;

      // Links and buttons would navigate away from the page being edited, which
      // is confusing — selecting the section is the more useful outcome.
      if (target?.closest("a, button, summary, input, select, textarea")) {
        event.preventDefault();
        event.stopPropagation();
      }

      const id = target?.closest<HTMLElement>("[data-section-id]")?.dataset.sectionId;
      if (id) {
        selectedId = id;
        paint();
        post({ type: "select", sectionId: id });
      }
    }

    function onMove(event: MouseEvent) {
      const id =
        (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-section-id]")?.dataset
          .sectionId ?? null;
      if (id === hoverId) return;
      hoverId = id;
      paint();
      post({ type: "hover", sectionId: id });
    }

    function onLeave() {
      if (hoverId === null) return;
      hoverId = null;
      paint();
      post({ type: "hover", sectionId: null });
    }

    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as { source?: string; type?: string; sectionId?: string | null };
      if (payload?.source !== "hairtie-editor") return;

      if (payload.type === "select") {
        selectedId = payload.sectionId ?? null;
        paint();
        find(selectedId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (payload.type === "hover") {
        hoverId = payload.sectionId ?? null;
        paint();
      } else if (payload.type === "scrollTo") {
        find(payload.sectionId ?? null)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);
    window.addEventListener("message", onMessage);

    // Tell the editor we are ready, so it can push the current selection in.
    post({ type: "ready" });

    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("message", onMessage);
      badge.remove();
    };
  }, []);

  return null;
}
