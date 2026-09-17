"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import {
  ChevronLeft, Layers, Maximize2, Minimize2, Monitor, Palette, Plus, Redo2, Smartphone,
  Tablet, Undo2,
} from "lucide-react";
import { discardPageChanges, publishPageChanges, replacePageSections } from "@/app/actions/admin/editor";
import {
  blankBlock, getBlocksField, getSectionDef, readBlocks, withDefaults, type EditorSection,
} from "@/lib/sections";
import { SectionField, type PickerData } from "@/components/admin/SectionFields";
import { AddSectionPanel } from "@/components/admin/AddSectionPanel";
import {
  LockedRow, SectionTree, isBlockDragId, parseBlockDragId,
  type Selection, type TreeOps,
} from "@/components/admin/SectionTree";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export type { EditorSection };

const DEVICES = {
  desktop: { width: "100%", label: "Desktop", icon: Monitor },
  tablet: { width: 834, label: "Tablet", icon: Tablet },
  mobile: { width: 402, label: "Mobile", icon: Smartphone },
} as const;
type Device = keyof typeof DEVICES;

/**
 * Sections and blocks share one drag context, so a drag has to be kept inside
 * its own list: a block belongs to its section and a section never drops into
 * one. Narrowing the candidates before measuring is what makes that work.
 */
const collideWithinList: CollisionDetection = (args) => {
  const activeId = String(args.active.id);
  const draggingBlock = isBlockDragId(activeId);
  const parentId = draggingBlock ? parseBlockDragId(activeId).sectionId : null;

  const droppableContainers = args.droppableContainers.filter((container) => {
    const id = String(container.id);
    if (!draggingBlock) return !isBlockDragId(id);
    return isBlockDragId(id) && parseBlockDragId(id).sectionId === parentId;
  });

  return closestCenter({ ...args, droppableContainers });
};

/** Ids only have to be unique inside one page, and never leave the browser un-saved. */
function newSectionId() {
  return `sec_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function WebsiteEditor({
  pageId,
  slug,
  pageTitle,
  pages,
  sections: initialSections,
  hasDraftChanges,
  categories,
}: {
  pageId: string;
  slug: string;
  pageTitle: string;
  pages: { slug: string; title: string; isPublished: boolean }[];
  sections: EditorSection[];
  hasDraftChanges: boolean;
  categories: PickerData["categories"];
}) {
  const router = useRouter();
  const { show } = useToast();

  const [sections, setSections] = useState(initialSections);
  const [past, setPast] = useState<EditorSection[][]>([]);
  const [future, setFuture] = useState<EditorSection[][]>([]);
  const [selection, setSelection] = useState<Selection>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [zen, setZen] = useState(false);
  const [dirty, setDirty] = useState(hasDraftChanges);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [pending, start] = useTransition();

  // Re-sync with the server after publish / discard, without an effect.
  const [synced, setSynced] = useState(initialSections);
  if (synced !== initialSections) {
    setSynced(initialSections);
    setSections(initialSections);
    setPast([]);
    setFuture([]);
  }
  const [syncedDirty, setSyncedDirty] = useState(hasDraftChanges);
  if (syncedDirty !== hasDraftChanges) {
    setSyncedDirty(hasDraftChanges);
    setDirty(hasDraftChanges);
  }

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pendingSave = useRef<EditorSection[] | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coalesce = useRef<{ key: string; at: number } | null>(null);

  const data: PickerData = useMemo(() => ({ categories }), [categories]);

  /* ---------------------------------------------------------------- saving */

  const flush = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const next = pendingSave.current;
    pendingSave.current = null;
    if (!next) return;

    setSaving(true);
    const result = await replacePageSections(pageId, next);
    setSaving(false);
    if (!result.ok) {
      show(result.message ?? "Could not save that change.", "error");
      return;
    }
    setReloadToken((token) => token + 1);
  }, [pageId, show]);

  const persist = useCallback(
    (next: EditorSection[]) => {
      pendingSave.current = next;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void flush(), 700);
    },
    [flush],
  );

  // Nothing is lost on a stray tab close, but an in-flight save is worth a nudge.
  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (pendingSave.current) event.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  /* --------------------------------------------------------------- history */

  const apply = useCallback(
    (next: EditorSection[], coalesceKey?: string) => {
      const at = Date.now();
      const last = coalesce.current;
      const merge =
        last !== null && coalesceKey !== undefined && last.key === coalesceKey && at - last.at < 1500;

      if (!merge) setPast((stack) => [...stack.slice(-59), sections]);
      coalesce.current = coalesceKey ? { key: coalesceKey, at } : null;
      setFuture([]);
      setSections(next);
      setDirty(true);
      persist(next);
    },
    [sections, persist],
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(past.slice(0, -1));
    setFuture([sections, ...future]);
    setSections(previous);
    setDirty(true);
    coalesce.current = null;
    persist(previous);
  }, [past, future, sections, persist]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(future.slice(1));
    setPast([...past, sections]);
    setSections(next);
    setDirty(true);
    coalesce.current = null;
    persist(next);
  }, [past, future, sections, persist]);

  /* ------------------------------------------------------- preview bridge */

  const tellPreview = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: "hairtie-editor", ...message },
      window.location.origin,
    );
  }, []);

  const selectedId = selection?.sectionId ?? null;

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const payload = event.data as { source?: string; type?: string; sectionId?: string | null };
      if (payload?.source !== "hairtie-preview") return;

      if (payload.type === "select" && payload.sectionId) {
        setSelection({ sectionId: payload.sectionId, blockIndex: null });
      } else if (payload.type === "hover") {
        setHoveredId(payload.sectionId ?? null);
      } else if (payload.type === "ready") {
        // The preview just (re)loaded — put it back where the admin was.
        iframeRef.current?.contentWindow?.postMessage(
          { source: "hairtie-editor", type: "select", sectionId: selectedId },
          window.location.origin,
        );
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [selectedId]);

  useEffect(() => {
    tellPreview({ type: "select", sectionId: selectedId });
  }, [selectedId, tellPreview]);

  useEffect(() => {
    tellPreview({ type: "hover", sectionId: hoveredId });
  }, [hoveredId, tellPreview]);

  /* ------------------------------------------------------------ shortcuts */

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (event.key === "Escape") {
        setSelection(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  /* ------------------------------------------------------------ mutations */

  const replaceSection = useCallback(
    (sectionId: string, change: (section: EditorSection) => EditorSection, coalesceKey?: string) => {
      apply(
        sections.map((section) => (section.id === sectionId ? change(section) : section)),
        coalesceKey,
      );
    },
    [apply, sections],
  );

  const setBlocks = useCallback(
    (sectionId: string, blocks: Record<string, unknown>[], coalesceKey?: string) => {
      const field = getBlocksField(sections.find((entry) => entry.id === sectionId)?.type ?? "");
      if (!field) return;
      replaceSection(
        sectionId,
        (section) => ({ ...section, settings: { ...section.settings, [field.key]: blocks } }),
        coalesceKey,
      );
    },
    [replaceSection, sections],
  );

  function addSectionOfType(type: string, index: number) {
    const def = getSectionDef(type);
    if (!def) return;
    const section: EditorSection = {
      id: newSectionId(),
      type,
      isHidden: false,
      settings: structuredClone(def.defaults),
    };
    const next = [...sections];
    next.splice(Math.min(Math.max(index, 0), next.length), 0, section);
    apply(next);
    setSelection({ sectionId: section.id, blockIndex: null });
    if (def.blocksKey) setExpanded((current) => new Set(current).add(section.id));
    show(`${def.label} added.`);
  }

  const ops: TreeOps = {
    select: setSelection,
    hover: setHoveredId,
    toggleExpanded: (sectionId) =>
      setExpanded((current) => {
        const next = new Set(current);
        if (next.has(sectionId)) next.delete(sectionId);
        else next.add(sectionId);
        return next;
      }),
    moveSection: (sectionId, direction) => {
      const index = sections.findIndex((section) => section.id === sectionId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sections.length) return;
      apply(arrayMove(sections, index, target));
    },
    duplicateSection: (sectionId) => {
      const index = sections.findIndex((section) => section.id === sectionId);
      if (index < 0) return;
      const copy: EditorSection = {
        ...structuredClone(sections[index]),
        id: newSectionId(),
      };
      const next = [...sections];
      next.splice(index + 1, 0, copy);
      apply(next);
      setSelection({ sectionId: copy.id, blockIndex: null });
    },
    toggleSectionHidden: (sectionId) =>
      replaceSection(sectionId, (section) => ({ ...section, isHidden: !section.isHidden })),
    deleteSection: (sectionId) => {
      const section = sections.find((entry) => entry.id === sectionId);
      if (!section) return;
      const label = getSectionDef(section.type)?.label ?? "this section";
      if (!window.confirm(`Delete ${label}? You can undo this straight afterwards.`)) return;
      apply(sections.filter((entry) => entry.id !== sectionId));
      if (selection?.sectionId === sectionId) setSelection(null);
    },
    insertAt: (index) => setInsertAt(index),
    addBlock: (sectionId) => {
      const section = sections.find((entry) => entry.id === sectionId);
      const field = getBlocksField(section?.type ?? "");
      if (!section || !field) return;
      const blocks = readBlocks(section.type, withDefaults(section.type, section.settings));
      if (field.max && blocks.length >= field.max) return;
      setBlocks(sectionId, [...blocks, blankBlock(field)]);
      setSelection({ sectionId, blockIndex: blocks.length });
      setExpanded((current) => new Set(current).add(sectionId));
    },
    duplicateBlock: (sectionId, index) => {
      const section = sections.find((entry) => entry.id === sectionId);
      const field = getBlocksField(section?.type ?? "");
      if (!section || !field) return;
      const blocks = readBlocks(section.type, withDefaults(section.type, section.settings));
      if (field.max && blocks.length >= field.max) {
        show(`You can have up to ${field.max} of these.`, "error");
        return;
      }
      const next = [...blocks];
      next.splice(index + 1, 0, structuredClone(blocks[index]));
      setBlocks(sectionId, next);
      setSelection({ sectionId, blockIndex: index + 1 });
    },
    toggleBlockHidden: (sectionId, index) => {
      const section = sections.find((entry) => entry.id === sectionId);
      if (!section) return;
      const blocks = readBlocks(section.type, withDefaults(section.type, section.settings));
      setBlocks(
        sectionId,
        blocks.map((block, i) => (i === index ? { ...block, _hidden: block._hidden !== true } : block)),
      );
    },
    deleteBlock: (sectionId, index) => {
      const section = sections.find((entry) => entry.id === sectionId);
      if (!section) return;
      const blocks = readBlocks(section.type, withDefaults(section.type, section.settings));
      setBlocks(sectionId, blocks.filter((_, i) => i !== index));
      if (selection?.sectionId === sectionId && selection.blockIndex === index) {
        setSelection({ sectionId, blockIndex: null });
      }
    },
  };

  /* ---------------------------------------------------------- drag & drop */

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function onDragStart(event: DragStartEvent) {
    setDragging(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setDragging(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    if (isBlockDragId(activeId)) {
      // Blocks belong to their section, so a block only sorts inside its own list.
      if (!isBlockDragId(overId)) return;
      const from = parseBlockDragId(activeId);
      const to = parseBlockDragId(overId);
      if (from.sectionId !== to.sectionId) return;
      const section = sections.find((entry) => entry.id === from.sectionId);
      if (!section) return;
      const blocks = readBlocks(section.type, withDefaults(section.type, section.settings));
      setBlocks(from.sectionId, arrayMove(blocks, from.index, to.index));
      if (selection?.sectionId === from.sectionId && selection.blockIndex === from.index) {
        setSelection({ sectionId: from.sectionId, blockIndex: to.index });
      }
      return;
    }

    if (isBlockDragId(overId)) return;
    const from = sections.findIndex((section) => section.id === activeId);
    const to = sections.findIndex((section) => section.id === overId);
    if (from < 0 || to < 0) return;
    apply(arrayMove(sections, from, to));
  }

  /* ------------------------------------------------------------- settings */

  const selectedSection = sections.find((section) => section.id === selection?.sectionId) ?? null;
  const selectedDef = selectedSection ? getSectionDef(selectedSection.type) : null;
  const blocksField = selectedSection ? getBlocksField(selectedSection.type) : null;
  const selectedSettings = selectedSection
    ? withDefaults(selectedSection.type, selectedSection.settings)
    : null;
  const selectedBlocks = selectedSection
    ? readBlocks(selectedSection.type, selectedSettings)
    : [];
  const selectedBlock =
    selection?.blockIndex !== null && selection?.blockIndex !== undefined
      ? (selectedBlocks[selection.blockIndex] ?? null)
      : null;

  function editSetting(key: string, value: unknown) {
    if (!selectedSection || !selectedSettings) return;
    replaceSection(
      selectedSection.id,
      (section) => ({ ...section, settings: { ...selectedSettings, [key]: value } }),
      `${selectedSection.id}:${key}`,
    );
  }

  function editBlockField(key: string, value: unknown) {
    if (!selectedSection || selection?.blockIndex === null || selection?.blockIndex === undefined) return;
    const index = selection.blockIndex;
    setBlocks(
      selectedSection.id,
      selectedBlocks.map((block, i) => (i === index ? { ...block, [key]: value } : block)),
      `${selectedSection.id}:${index}:${key}`,
    );
  }

  /* ------------------------------------------------------------------ UI */

  const publish = () =>
    start(async () => {
      await flush();
      const result = await publishPageChanges(slug);
      show(result.message ?? "", result.ok ? "default" : "error");
      if (result.ok) {
        setDirty(false);
        router.refresh();
      }
    });

  return (
    // -mb-16 cancels the admin shell's bottom padding: the editor is a
    // full-height app, not a scrolling page.
    <div
      className="-mb-16 flex h-[calc(100vh-3.25rem)] flex-col lg:h-screen"
      style={{ background: "var(--adm-bg)" }}
    >
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5"
        style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/admin/editor" className="flex items-center gap-1 text-sm" style={{ color: "var(--adm-muted)" }}>
            <ChevronLeft size={16} strokeWidth={1.8} /> Pages
          </Link>

          <label className="sr-only" htmlFor="editor-page-switcher">Page being edited</label>
          <select
            id="editor-page-switcher"
            className="adm-input h-9 max-w-[13rem] py-0 text-sm"
            value={slug}
            onChange={(event) => {
              void flush().then(() => router.push(`/admin/editor/${event.target.value}`));
            }}
          >
            {pages.map((page) => (
              <option key={page.slug} value={page.slug}>
                {page.title}
                {page.isPublished ? "" : " (draft)"}
              </option>
            ))}
          </select>

          <span className="hidden whitespace-nowrap text-xs lg:inline" style={{ color: "var(--adm-muted)" }}>
            {saving ? "Saving…" : dirty ? "Unpublished changes" : "Everything is published"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg p-0.5" style={{ background: "var(--adm-bg)" }}>
            <button
              type="button"
              onClick={undo}
              disabled={past.length === 0}
              aria-label="Undo"
              title="Undo (⌘Z)"
              className="rounded-md p-1.5 disabled:opacity-30"
            >
              <Undo2 size={15} strokeWidth={1.7} />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={future.length === 0}
              aria-label="Redo"
              title="Redo (⌘⇧Z)"
              className="rounded-md p-1.5 disabled:opacity-30"
            >
              <Redo2 size={15} strokeWidth={1.7} />
            </button>
          </div>

          <div className="flex rounded-lg p-0.5" style={{ background: "var(--adm-bg)" }}>
            {(Object.keys(DEVICES) as Device[]).map((key) => {
              const Icon = DEVICES[key].icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDevice(key)}
                  aria-label={`${DEVICES[key].label} preview`}
                  aria-pressed={device === key}
                  className="rounded-md p-1.5"
                  style={{ background: device === key ? "var(--adm-surface)" : "transparent" }}
                >
                  <Icon size={15} strokeWidth={1.7} />
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setZen((current) => !current)}
              aria-label={zen ? "Show the section panel" : "Hide the section panel"}
              aria-pressed={zen}
              className="rounded-md p-1.5"
              style={{ background: zen ? "var(--adm-surface)" : "transparent" }}
            >
              {zen ? <Minimize2 size={15} strokeWidth={1.7} /> : <Maximize2 size={15} strokeWidth={1.7} />}
            </button>
          </div>

          <a
            href={`/preview/${slug}?edit=0`}
            target="_blank"
            rel="noreferrer"
            className="adm-btn adm-btn-ghost adm-btn-sm"
          >
            Full preview
          </a>

          {dirty && (
            <button
              type="button"
              className="adm-btn adm-btn-ghost adm-btn-sm"
              disabled={pending}
              onClick={() => {
                if (!window.confirm("Throw away every change since you last published?")) return;
                start(async () => {
                  if (saveTimer.current) clearTimeout(saveTimer.current);
                  pendingSave.current = null;
                  const result = await discardPageChanges(slug);
                  show(result.message ?? "", result.ok ? "default" : "error");
                  if (result.ok) {
                    setDirty(false);
                    setSelection(null);
                    router.refresh();
                    setReloadToken((token) => token + 1);
                  }
                });
              }}
            >
              Discard
            </button>
          )}

          <button
            type="button"
            className="adm-btn adm-btn-primary adm-btn-sm"
            disabled={pending || !dirty}
            onClick={publish}
          >
            {pending ? <Spinner size={13} /> : null}
            {dirty ? "Publish changes" : "Published"}
          </button>
        </div>
      </header>

      <DndContext
        id="page-tree"
        sensors={sensors}
        collisionDetection={collideWithinList}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDragging(null)}
      >
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {!zen && (
            <aside
              className="flex w-full shrink-0 flex-col border-b lg:w-72 lg:min-h-0 lg:overflow-hidden lg:border-b-0 lg:border-r"
              style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
            >
              <div className="flex shrink-0 items-center justify-between px-3 py-3">
                <h2 className="flex items-center gap-1.5 text-sm font-medium">
                  <Layers size={14} strokeWidth={1.8} /> {pageTitle}
                </h2>
                <button
                  type="button"
                  className="adm-btn adm-btn-ghost adm-btn-sm"
                  onClick={() => setInsertAt(sections.length)}
                >
                  <Plus size={13} strokeWidth={2} /> Add
                </button>
              </div>

              <div className="shrink-0 px-3">
                <LockedRow label="Header" hint="Logo, menu and search — shared by every page" href="/admin/settings" />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-1">
                {sections.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setInsertAt(0)}
                    className="w-full rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm"
                    style={{ borderColor: "var(--adm-line)", color: "var(--adm-muted)" }}
                  >
                    This page is empty — add your first section.
                  </button>
                ) : (
                  <SectionTree
                    sections={sections}
                    selection={selection}
                    hoveredId={hoveredId}
                    expanded={expanded}
                    ops={ops}
                  />
                )}
              </div>

              <div className="shrink-0 px-3">
                <LockedRow label="Footer" hint="Links, contact details and socials" href="/admin/settings" />
              </div>

              <div className="mt-1 shrink-0 border-t px-3 py-3" style={{ borderColor: "var(--adm-line)" }}>
                <Link
                  href="/admin/appearance"
                  className="flex items-center gap-2 rounded-lg px-2 py-2 text-[0.82rem] transition hover:bg-[var(--adm-bg)]"
                >
                  <Palette size={13} strokeWidth={1.8} style={{ color: "var(--adm-muted)" }} />
                  <span>
                    <span className="block">Theme settings</span>
                    <span className="block text-[0.66rem]" style={{ color: "var(--adm-muted)" }}>
                      Colours, fonts, buttons and layout
                    </span>
                  </span>
                </Link>
                <p className="mt-2 px-2 text-[0.66rem] leading-relaxed" style={{ color: "var(--adm-muted)" }}>
                  Drag the handles to reorder. Changes save as you go — press Publish to make them live.
                  ⌘Z undoes, Esc closes the settings panel.
                </p>
              </div>
            </aside>
          )}

          {!zen && selectedSection && selectedDef && selectedSettings && (
            <aside
              className="w-full shrink-0 overflow-y-auto border-b lg:w-80 lg:border-b-0 lg:border-r"
              style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
            >
              <div className="p-4">
                <div className="mb-4">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--adm-muted)" }}
                    onClick={() =>
                      selectedBlock
                        ? setSelection({ sectionId: selectedSection.id, blockIndex: null })
                        : setSelection(null)
                    }
                  >
                    <ChevronLeft size={13} strokeWidth={2} />
                    {selectedBlock ? selectedDef.label : "All sections"}
                  </button>
                  <p className="mt-1 font-medium">
                    {selectedBlock && blocksField
                      ? `${blocksField.itemIcon ?? ""} ${blocksField.itemLabel} ${(selection?.blockIndex ?? 0) + 1}`
                      : `${selectedDef.icon} ${selectedDef.label}`}
                  </p>
                  {!selectedBlock && (
                    <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                      {selectedDef.description}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {selectedBlock && blocksField
                    ? blocksField.fields.map((field) => (
                        <SectionField
                          key={field.key}
                          field={field}
                          value={selectedBlock[field.key]}
                          data={data}
                          onChange={(value) => editBlockField(field.key, value)}
                        />
                      ))
                    : selectedDef.fields
                        .filter((field) => field.key !== selectedDef.blocksKey)
                        .map((field) => (
                          <SectionField
                            key={field.key}
                            field={field}
                            value={selectedSettings[field.key]}
                            data={data}
                            onChange={(value) => editSetting(field.key, value)}
                          />
                        ))}
                </div>

                {!selectedBlock && blocksField && (
                  <div className="mt-5 rounded-lg p-3 text-xs" style={{ background: "var(--adm-bg)", color: "var(--adm-muted)" }}>
                    This section has {selectedBlocks.length}{" "}
                    {blocksField.itemLabel.toLowerCase()}
                    {selectedBlocks.length === 1 ? "" : "s"}. Open them from the list on the left —
                    you can drag them into any order there.
                  </div>
                )}

                <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: "var(--adm-muted)" }}>
                  {saving ? (
                    <>
                      <Spinner size={11} /> Saving…
                    </>
                  ) : (
                    "Changes save automatically. Press Publish when you're happy with them."
                  )}
                </p>
              </div>
            </aside>
          )}

          <div className="min-h-0 flex-1 overflow-hidden p-3 lg:p-5">
            <div
              className="mx-auto h-full overflow-hidden rounded-xl transition-all duration-300"
              style={{
                width: DEVICES[device].width,
                maxWidth: "100%",
                border: "1px solid var(--adm-line)",
                background: "#fff",
                boxShadow: "0 10px 40px -30px rgba(46,42,38,0.5)",
                // Shopify pulls the canvas back while you drag so you can see
                // where the section is going to land — same idea here.
                transform: dragging ? "scale(0.94)" : "none",
                opacity: dragging ? 0.75 : 1,
              }}
            >
              <iframe
                ref={iframeRef}
                key={reloadToken}
                src={`/preview/${slug}?v=${reloadToken}`}
                title="Website preview"
                className="h-full w-full border-0"
                style={{ minHeight: 480 }}
              />
            </div>
          </div>
        </div>

        <DragOverlay dropAnimation={null}>
          {dragging ? (
            <div
              className="rounded-lg px-3 py-2 text-[0.8rem] shadow-lg"
              style={{ background: "var(--adm-surface)", border: "1px solid var(--adm-line)" }}
            >
              {dragLabel(sections, dragging)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {insertAt !== null && (
        <AddSectionPanel
          positionLabel={
            insertAt >= sections.length
              ? "It will be added at the bottom of the page."
              : `It will be added above “${sectionLabelAt(sections, insertAt)}”.`
          }
          onClose={() => setInsertAt(null)}
          onPick={(type) => {
            const index = insertAt;
            setInsertAt(null);
            addSectionOfType(type, index);
          }}
        />
      )}
    </div>
  );
}

function sectionLabelAt(sections: EditorSection[], index: number) {
  const section = sections[index];
  if (!section) return "the end";
  const settings = withDefaults(section.type, section.settings);
  return String(settings.heading ?? "") || getSectionDef(section.type)?.label || section.type;
}

function dragLabel(sections: EditorSection[], dragId: string) {
  if (isBlockDragId(dragId)) {
    const { sectionId, index } = parseBlockDragId(dragId);
    const section = sections.find((entry) => entry.id === sectionId);
    const field = getBlocksField(section?.type ?? "");
    return field ? `${field.itemLabel} ${index + 1}` : "Block";
  }
  const section = sections.find((entry) => entry.id === dragId);
  if (!section) return "Section";
  const def = getSectionDef(section.type);
  const settings = withDefaults(section.type, section.settings);
  return `${def?.icon ?? ""} ${String(settings.heading ?? "") || def?.label || section.type}`.trim();
}
