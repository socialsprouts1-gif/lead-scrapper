"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown, ChevronLeft, ChevronUp, Copy, Eye, EyeOff, GripVertical, Monitor, Plus,
  Smartphone, Trash2, Undo2,
} from "lucide-react";
import {
  addSection, deleteSection, discardPageChanges, duplicateSection, moveSection,
  publishPageChanges, reorderSections, toggleSectionHidden, updateSection,
} from "@/app/actions/admin/editor";
import { SECTION_REGISTRY, getSectionDef, withDefaults } from "@/lib/sections";
import { SectionField, type PickerData } from "@/components/admin/SectionFields";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export type EditorSection = {
  id: string;
  type: string;
  isHidden: boolean;
  settings: Record<string, unknown>;
};

export function WebsiteEditor({
  pageId,
  slug,
  pageTitle,
  sections: initialSections,
  hasDraftChanges,
  categories,
}: {
  pageId: string;
  slug: string;
  pageTitle: string;
  sections: EditorSection[];
  hasDraftChanges: boolean;
  categories: PickerData["categories"];
}) {
  const router = useRouter();
  const { show } = useToast();
  const [sections, setSections] = useState(initialSections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftSettings, setDraftSettings] = useState<Record<string, unknown> | null>(null);
  const [adding, setAdding] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [dirty, setDirty] = useState(hasDraftChanges);
  const [pending, start] = useTransition();
  const [savingField, setSavingField] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Re-sync with the server after a refresh, without an effect.
  const [syncedSections, setSyncedSections] = useState(initialSections);
  if (syncedSections !== initialSections) {
    setSyncedSections(initialSections);
    setSections(initialSections);
  }
  const [syncedDirty, setSyncedDirty] = useState(hasDraftChanges);
  if (syncedDirty !== hasDraftChanges) {
    setSyncedDirty(hasDraftChanges);
    setDirty(hasDraftChanges);
  }

  const selected = sections.find((section) => section.id === selectedId) ?? null;
  const def = selected ? getSectionDef(selected.type) : null;
  const data: PickerData = useMemo(() => ({ categories }), [categories]);

  const previewSrc = `/preview/${slug}?selected=${selectedId ?? ""}`;

  const reloadPreview = useCallback(() => {
    const frame = iframeRef.current;
    if (!frame) return;
    // Reassigning src (rather than reload()) keeps the ?selected marker in sync.
    frame.src = `/preview/${slug}?selected=${selectedId ?? ""}&t=${Date.now()}`;
  }, [slug, selectedId]);

  // Clicking a section inside the preview selects it here.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as { source?: string; type?: string; sectionId?: string };
      if (payload?.source !== "hairtie-preview") return;
      if (payload.type === "select" && payload.sectionId) {
        setSelectedId(payload.sectionId);
        setDraftSettings(null);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function run(
    action: () => Promise<{ ok: boolean; message?: string }>,
    options: { refreshPreview?: boolean; quiet?: boolean } = {},
  ) {
    start(async () => {
      const result = await action();
      if (result.message && !options.quiet) show(result.message, result.ok ? "default" : "error");
      if (result.ok) {
        setDirty(true);
        router.refresh();
        if (options.refreshPreview !== false) setTimeout(reloadPreview, 120);
      }
    });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((section) => section.id === active.id);
    const newIndex = sections.findIndex((section) => section.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(sections, oldIndex, newIndex);
    setSections(next);
    run(() => reorderSections(pageId, next.map((section) => section.id)), { quiet: true });
  }

  // Field edits are saved as the admin types, debounced — there is no "lost
  // changes" trap, and Publish is still what makes them public.
  const settings = draftSettings ?? (selected ? withDefaults(selected.type, selected.settings) : null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function editField(key: string, value: unknown) {
    if (!selected || !settings) return;
    const next = { ...settings, [key]: value };
    setDraftSettings(next);
    setSavingField(true);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const result = await updateSection(selected.id, next);
      setSavingField(false);
      if (!result.ok) {
        show(result.message ?? "Could not save.", "error");
        return;
      }
      setSections((current) =>
        current.map((section) => (section.id === selected.id ? { ...section, settings: next } : section)),
      );
      setDirty(true);
      reloadPreview();
    }, 600);
  }

  return (
    <div
      className="flex h-[calc(100vh-3.25rem)] flex-col lg:h-screen"
      style={{ background: "var(--adm-bg)" }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/admin/editor" className="flex items-center gap-1 text-sm" style={{ color: "var(--adm-muted)" }}>
            <ChevronLeft size={16} strokeWidth={1.8} /> Pages
          </Link>
          <div>
            <p className="text-sm font-medium">{pageTitle}</p>
            <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
              {dirty ? "You have unpublished changes" : "Everything is published"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg p-0.5" style={{ background: "var(--adm-bg)" }}>
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              aria-label="Desktop preview"
              aria-pressed={device === "desktop"}
              className="rounded-md p-1.5"
              style={{ background: device === "desktop" ? "var(--adm-surface)" : "transparent" }}
            >
              <Monitor size={15} strokeWidth={1.7} />
            </button>
            <button
              type="button"
              onClick={() => setDevice("mobile")}
              aria-label="Mobile preview"
              aria-pressed={device === "mobile"}
              className="rounded-md p-1.5"
              style={{ background: device === "mobile" ? "var(--adm-surface)" : "transparent" }}
            >
              <Smartphone size={15} strokeWidth={1.7} />
            </button>
          </div>

          <a href={`/preview/${slug}`} target="_blank" rel="noreferrer" className="adm-btn adm-btn-ghost adm-btn-sm">
            Full preview
          </a>

          {dirty && (
            <button
              type="button"
              className="adm-btn adm-btn-ghost adm-btn-sm"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Throw away every change since you last published?")) return;
                run(async () => {
                  const result = await discardPageChanges(slug);
                  if (result.ok) setDirty(false);
                  return result;
                });
              }}
            >
              <Undo2 size={14} strokeWidth={1.7} /> Discard
            </button>
          )}

          <button
            type="button"
            className="adm-btn adm-btn-primary adm-btn-sm"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                const result = await publishPageChanges(slug);
                show(result.message ?? "", result.ok ? "default" : "error");
                if (result.ok) {
                  setDirty(false);
                  router.refresh();
                }
              })
            }
          >
            {pending ? <Spinner size={13} /> : null}
            {dirty ? "Publish changes" : "Published"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          className="w-full shrink-0 overflow-y-auto border-b lg:w-80 lg:border-b-0 lg:border-r"
          style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
        >
          {selected && def && settings ? (
            <div className="p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs" style={{ color: "var(--adm-muted)" }}>Editing</p>
                  <p className="font-medium">{def.icon} {def.label}</p>
                </div>
                <button
                  type="button"
                  className="text-sm underline underline-offset-2"
                  onClick={() => {
                    setSelectedId(null);
                    setDraftSettings(null);
                  }}
                >
                  Done
                </button>
              </div>

              <div className="space-y-4">
                {def.fields.map((field) => (
                  <SectionField
                    key={field.key}
                    field={field}
                    value={settings[field.key]}
                    data={data}
                    onChange={(value) => editField(field.key, value)}
                  />
                ))}
              </div>

              <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: "var(--adm-muted)" }}>
                {savingField ? (
                  <><Spinner size={11} /> Saving…</>
                ) : (
                  "Changes save automatically. Press Publish when you're happy with them."
                )}
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base">Sections</h2>
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setAdding(true)}>
                  <Plus size={14} strokeWidth={1.8} /> Add
                </button>
              </div>
              <p className="mb-3 text-xs" style={{ color: "var(--adm-muted)" }}>
                Click a section in the preview, or in this list, to edit it. Drag the handles to reorder.
              </p>

              <DndContext id="section-order" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-1">
                    {sections.map((section, index) => (
                      <SortableSection
                        key={section.id}
                        section={section}
                        isFirst={index === 0}
                        isLast={index === sections.length - 1}
                        onSelect={() => {
                          setSelectedId(section.id);
                          setDraftSettings(null);
                        }}
                        onMove={(direction) => run(() => moveSection(section.id, direction))}
                        onDuplicate={() => run(() => duplicateSection(section.id))}
                        onToggleHidden={() => run(() => toggleSectionHidden(section.id, !section.isHidden))}
                        onDelete={() => {
                          if (!window.confirm("Delete this section? You can add it again later.")) return;
                          run(() => deleteSection(section.id));
                        }}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>

              {sections.length === 0 && (
                <p className="rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm" style={{ borderColor: "var(--adm-line)", color: "var(--adm-muted)" }}>
                  This page has no sections yet.
                </p>
              )}

              <button type="button" className="adm-btn adm-btn-ghost mt-3 w-full" onClick={() => setAdding(true)}>
                <Plus size={15} strokeWidth={1.8} /> Add a section
              </button>
            </div>
          )}
        </aside>

        <div className="min-h-0 flex-1 overflow-hidden p-3 lg:p-5">
          <div
            className="mx-auto h-full overflow-hidden rounded-xl transition-all"
            style={{
              width: device === "mobile" ? 402 : "100%",
              maxWidth: "100%",
              border: "1px solid var(--adm-line)",
              background: "#fff",
              boxShadow: "0 10px 40px -30px rgba(46,42,38,0.5)",
            }}
          >
            <iframe
              ref={iframeRef}
              src={previewSrc}
              title="Website preview"
              className="h-full w-full border-0"
              style={{ minHeight: 480 }}
            />
          </div>
        </div>
      </div>

      {adding && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Add a section">
          <button type="button" aria-label="Close" className="absolute inset-0" style={{ background: "rgba(46,42,38,0.5)" }} onClick={() => setAdding(false)} />
          <div
            className="relative max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl p-6 sm:rounded-2xl"
            style={{ background: "var(--adm-surface)" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg">Add a section</h2>
                <p className="text-sm" style={{ color: "var(--adm-muted)" }}>
                  It gets added to the bottom of the page — drag it wherever you like afterwards.
                </p>
              </div>
              <button type="button" onClick={() => setAdding(false)} className="text-sm underline underline-offset-2">Cancel</button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {SECTION_REGISTRY.map((entry) => (
                <button
                  key={entry.type}
                  type="button"
                  className="flex items-start gap-3 rounded-xl p-3 text-left transition hover:border-[var(--adm-accent)]"
                  style={{ border: "1px solid var(--adm-line)" }}
                  onClick={() => {
                    setAdding(false);
                    start(async () => {
                      const result = await addSection(pageId, entry.type);
                      show(result.message ?? "", result.ok ? "default" : "error");
                      if (result.ok) {
                        setDirty(true);
                        if (result.data && typeof result.data === "object" && "id" in result.data) {
                          setSelectedId((result.data as { id: string }).id);
                          setDraftSettings(null);
                        }
                        router.refresh();
                        setTimeout(reloadPreview, 150);
                      }
                    });
                  }}
                >
                  <span className="text-xl leading-none">{entry.icon}</span>
                  <span>
                    <span className="block text-sm font-medium">{entry.label}</span>
                    <span className="block text-xs" style={{ color: "var(--adm-muted)" }}>{entry.description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SortableSection({
  section,
  isFirst,
  isLast,
  onSelect,
  onMove,
  onDuplicate,
  onToggleHidden,
  onDelete,
}: {
  section: EditorSection;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onMove: (direction: "up" | "down") => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const def = getSectionDef(section.type);
  const settings = withDefaults(section.type, section.settings);
  const label = String(settings.heading ?? "") || def?.label || section.type;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="rounded-lg"
    >
      <div className="group flex items-center gap-1 rounded-lg px-1.5 py-1.5 hover:bg-[var(--adm-bg)]">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${label}`}
          className="cursor-grab rounded p-1 active:cursor-grabbing"
          style={{ color: "var(--adm-muted)" }}
        >
          <GripVertical size={15} strokeWidth={1.7} />
        </button>

        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm" style={{ opacity: section.isHidden ? 0.55 : 1 }}>
            {def?.icon} {label}
          </span>
          <span className="block truncate text-[0.68rem]" style={{ color: "var(--adm-muted)" }}>
            {def?.label ?? section.type}
            {section.isHidden ? " · hidden" : ""}
          </span>
        </button>

        <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button type="button" onClick={() => onMove("up")} disabled={isFirst} aria-label={`Move ${label} up`} className="rounded p-1 disabled:opacity-30">
            <ChevronUp size={14} strokeWidth={1.9} />
          </button>
          <button type="button" onClick={() => onMove("down")} disabled={isLast} aria-label={`Move ${label} down`} className="rounded p-1 disabled:opacity-30">
            <ChevronDown size={14} strokeWidth={1.9} />
          </button>
          <button type="button" onClick={onToggleHidden} aria-label={section.isHidden ? `Show ${label}` : `Hide ${label}`} className="rounded p-1">
            {section.isHidden ? <EyeOff size={14} strokeWidth={1.7} /> : <Eye size={14} strokeWidth={1.7} />}
          </button>
          <button type="button" onClick={onDuplicate} aria-label={`Duplicate ${label}`} className="rounded p-1">
            <Copy size={14} strokeWidth={1.7} />
          </button>
          <button type="button" onClick={onDelete} aria-label={`Delete ${label}`} className="rounded p-1" style={{ color: "#9c3a3a" }}>
            <Trash2 size={14} strokeWidth={1.7} />
          </button>
        </div>
      </div>
    </li>
  );
}
