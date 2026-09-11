"use client";

import { useEffect } from "react";

/**
 * Runs inside the preview iframe. It makes every section clickable (selecting it
 * in the editor) and blocks ordinary link navigation so the preview stays on the
 * page being edited.
 */
export function PreviewBridge() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const section = target?.closest<HTMLElement>("[data-section-id]");

      // Links and buttons inside the preview would navigate away from the page
      // being edited, which is confusing — selecting the section is more useful.
      const interactive = target?.closest("a, button");
      if (interactive) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (section?.dataset.sectionId) {
        window.parent?.postMessage(
          { source: "hairtie-preview", type: "select", sectionId: section.dataset.sectionId },
          window.location.origin,
        );
      }
    }

    function onMove(event: MouseEvent) {
      const section = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-section-id]");
      document.querySelectorAll<HTMLElement>("[data-section-id]").forEach((element) => {
        element.style.cursor = "pointer";
        if (element !== section && element.dataset.selected !== "true") {
          element.style.boxShadow = "";
        }
      });
      if (section && section.dataset.selected !== "true") {
        section.style.boxShadow = "inset 0 0 0 2px color-mix(in srgb, var(--ht-primary) 55%, transparent)";
      }
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("mousemove", onMove);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("mousemove", onMove);
    };
  }, []);

  return null;
}
