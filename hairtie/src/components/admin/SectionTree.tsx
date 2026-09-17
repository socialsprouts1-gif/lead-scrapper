"use client";

import {
  ChevronDown, ChevronRight, Copy, Eye, EyeOff, GripVertical, Lock, Plus, Trash2,
} from "lucide-react";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  blockTitle, getBlocksField, getSectionDef, isBlockHidden, readBlocks, withDefaults,
  type EditorSection,
} from "@/lib/sections";

export type Selection = { sectionId: string; blockIndex: number | null } | null;

/** Blocks are addressed by position, which is all dnd-kit needs to sort them. */
export const blockDragId = (sectionId: string, index: number) => `${sectionId}::${index}`;
export const isBlockDragId = (id: string) => id.includes("::");
export const parseBlockDragId = (id: string) => {
  const [sectionId, index] = id.split("::");
  return { sectionId, index: Number(index) };
};

export type TreeOps = {
  select: (selection: Selection) => void;
  hover: (sectionId: string | null) => void;
  toggleExpanded: (sectionId: string) => void;
  moveSection: (sectionId: string, direction: -1 | 1) => void;
  duplicateSection: (sectionId: string) => void;
  toggleSectionHidden: (sectionId: string) => void;
  deleteSection: (sectionId: string) => void;
  insertAt: (index: number) => void;
  addBlock: (sectionId: string) => void;
  duplicateBlock: (sectionId: string, index: number) => void;
  toggleBlockHidden: (sectionId: string, index: number) => void;
  deleteBlock: (sectionId: string, index: number) => void;
};

export function SectionTree({
  sections,
  selection,
  hoveredId,
  expanded,
  ops,
}: {
  sections: EditorSection[];
  selection: Selection;
  hoveredId: string | null;
  expanded: Set<string>;
  ops: TreeOps;
}) {
  return (
    <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
      <ul className="space-y-0.5">
        <InsertDivider onClick={() => ops.insertAt(0)} label="Add a section at the top" />
        {sections.map((section, index) => (
          <SectionRow
            key={section.id}
            section={section}
            index={index}
            total={sections.length}
            selection={selection}
            hovered={hoveredId === section.id}
            expanded={expanded.has(section.id)}
            ops={ops}
          />
        ))}
      </ul>
    </SortableContext>
  );
}

function InsertDivider({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <li className="group/insert relative h-2.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center gap-2 opacity-0 transition group-hover/insert:opacity-100 focus-visible:opacity-100"
      >
        <span className="h-px flex-1" style={{ background: "var(--adm-accent, var(--adm-line))" }} />
        <span
          className="grid h-4 w-4 shrink-0 place-items-center rounded-full"
          style={{ background: "var(--adm-text)", color: "var(--adm-surface)" }}
        >
          <Plus size={10} strokeWidth={2.4} />
        </span>
        <span className="h-px flex-1" style={{ background: "var(--adm-accent, var(--adm-line))" }} />
      </button>
    </li>
  );
}

function SectionRow({
  section,
  index,
  total,
  selection,
  hovered,
  expanded,
  ops,
}: {
  section: EditorSection;
  index: number;
  total: number;
  selection: Selection;
  hovered: boolean;
  expanded: boolean;
  ops: TreeOps;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const def = getSectionDef(section.type);
  const settings = withDefaults(section.type, section.settings);
  const blocksField = getBlocksField(section.type);
  const blocks = readBlocks(section.type, settings);
  const label = String(settings.heading ?? settings.text ?? "") || def?.label || section.type;
  const isSelected = selection?.sectionId === section.id && selection.blockIndex === null;
  const active = selection?.sectionId === section.id;

  return (
    <>
      <li
        ref={setNodeRef}
        style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
        onMouseEnter={() => ops.hover(section.id)}
        onMouseLeave={() => ops.hover(null)}
      >
        <div
          className="group flex items-center gap-1 rounded-lg px-1 py-1.5 transition"
          style={{
            background: isSelected
              ? "var(--adm-bg)"
              : hovered
                ? "color-mix(in srgb, var(--adm-bg) 60%, transparent)"
                : "transparent",
            boxShadow: isSelected ? "inset 2px 0 0 var(--adm-text)" : undefined,
          }}
        >
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Reorder ${label}`}
            className="cursor-grab rounded p-1 opacity-40 transition group-hover:opacity-100 active:cursor-grabbing"
            style={{ color: "var(--adm-muted)" }}
          >
            <GripVertical size={14} strokeWidth={1.8} />
          </button>

          {blocksField ? (
            <button
              type="button"
              onClick={() => ops.toggleExpanded(section.id)}
              aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
              aria-expanded={expanded}
              className="rounded p-0.5"
              style={{ color: "var(--adm-muted)" }}
            >
              {expanded ? <ChevronDown size={13} strokeWidth={2} /> : <ChevronRight size={13} strokeWidth={2} />}
            </button>
          ) : (
            <span className="w-[1.125rem]" aria-hidden />
          )}

          <button
            type="button"
            onClick={() => ops.select({ sectionId: section.id, blockIndex: null })}
            className="min-w-0 flex-1 text-left"
          >
            <span
              className="flex items-center gap-1.5 truncate text-[0.82rem]"
              style={{ opacity: section.isHidden ? 0.5 : 1 }}
            >
              <span aria-hidden>{def?.icon}</span>
              <span className="truncate">{label}</span>
            </span>
            <span className="block truncate text-[0.66rem]" style={{ color: "var(--adm-muted)" }}>
              {def?.label ?? section.type}
              {blocksField && blocks.length > 0 ? ` · ${blocks.length} ${blocksField.itemLabel.toLowerCase()}${blocks.length === 1 ? "" : "s"}` : ""}
              {section.isHidden ? " · hidden" : ""}
            </span>
          </button>

          <RowActions
            label={label}
            isHidden={section.isHidden}
            canMoveUp={index > 0}
            canMoveDown={index < total - 1}
            onMove={(direction) => ops.moveSection(section.id, direction)}
            onToggleHidden={() => ops.toggleSectionHidden(section.id)}
            onDuplicate={() => ops.duplicateSection(section.id)}
            onDelete={() => ops.deleteSection(section.id)}
          />
        </div>

        {blocksField && expanded && (
          <div className="ml-6 border-l pl-1.5" style={{ borderColor: "var(--adm-line)" }}>
            <SortableContext
              items={blocks.map((_, blockIndex) => blockDragId(section.id, blockIndex))}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-0.5 py-0.5">
                {blocks.map((block, blockIndex) => (
                  <BlockRow
                    key={blockDragId(section.id, blockIndex)}
                    sectionId={section.id}
                    index={blockIndex}
                    total={blocks.length}
                    icon={blocksField.itemIcon ?? "▫️"}
                    title={blockTitle(blocksField, block, blockIndex)}
                    isHidden={isBlockHidden(block)}
                    isSelected={active && selection?.blockIndex === blockIndex}
                    ops={ops}
                  />
                ))}
              </ul>
            </SortableContext>

            {(!blocksField.max || blocks.length < blocksField.max) && (
              <button
                type="button"
                onClick={() => ops.addBlock(section.id)}
                className="mb-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[0.74rem] transition hover:bg-[var(--adm-bg)]"
                style={{ color: "var(--adm-muted)" }}
              >
                <Plus size={12} strokeWidth={2} /> Add {blocksField.itemLabel.toLowerCase()}
              </button>
            )}
          </div>
        )}
      </li>

      <InsertDivider onClick={() => ops.insertAt(index + 1)} label={`Add a section below ${label}`} />
    </>
  );
}

function BlockRow({
  sectionId,
  index,
  total,
  icon,
  title,
  isHidden,
  isSelected,
  ops,
}: {
  sectionId: string;
  index: number;
  total: number;
  icon: string;
  title: string;
  isHidden: boolean;
  isSelected: boolean;
  ops: TreeOps;
}) {
  const id = blockDragId(sectionId, index);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
    >
      <div
        className="group flex items-center gap-1 rounded-lg px-1 py-1 transition"
        style={{
          background: isSelected ? "var(--adm-bg)" : "transparent",
          boxShadow: isSelected ? "inset 2px 0 0 var(--adm-text)" : undefined,
        }}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${title}`}
          className="cursor-grab rounded p-0.5 opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
          style={{ color: "var(--adm-muted)" }}
        >
          <GripVertical size={13} strokeWidth={1.8} />
        </button>

        <button
          type="button"
          onClick={() => ops.select({ sectionId, blockIndex: index })}
          className="min-w-0 flex-1 truncate py-0.5 text-left text-[0.76rem]"
          style={{ opacity: isHidden ? 0.5 : 1 }}
        >
          <span aria-hidden className="mr-1.5">{icon}</span>
          {title}
          {isHidden ? " · hidden" : ""}
        </button>

        <RowActions
          compact
          label={title}
          isHidden={isHidden}
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
          onMove={() => undefined}
          onToggleHidden={() => ops.toggleBlockHidden(sectionId, index)}
          onDuplicate={() => ops.duplicateBlock(sectionId, index)}
          onDelete={() => ops.deleteBlock(sectionId, index)}
        />
      </div>
    </li>
  );
}

function RowActions({
  label,
  isHidden,
  canMoveUp,
  canMoveDown,
  compact = false,
  onMove,
  onToggleHidden,
  onDuplicate,
  onDelete,
}: {
  label: string;
  isHidden: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  compact?: boolean;
  onMove: (direction: -1 | 1) => void;
  onToggleHidden: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const size = compact ? 12 : 13;
  return (
    <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
      {!compact && (
        <>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={!canMoveUp}
            aria-label={`Move ${label} up`}
            className="rounded p-1 disabled:opacity-25"
          >
            <ChevronUpIcon size={size} />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={!canMoveDown}
            aria-label={`Move ${label} down`}
            className="rounded p-1 disabled:opacity-25"
          >
            <ChevronDownIcon size={size} />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={onToggleHidden}
        aria-label={isHidden ? `Show ${label}` : `Hide ${label}`}
        className="rounded p-1"
      >
        {isHidden ? <EyeOff size={size} strokeWidth={1.7} /> : <Eye size={size} strokeWidth={1.7} />}
      </button>
      <button type="button" onClick={onDuplicate} aria-label={`Duplicate ${label}`} className="rounded p-1">
        <Copy size={size} strokeWidth={1.7} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${label}`}
        className="rounded p-1"
        style={{ color: "#9c3a3a" }}
      >
        <Trash2 size={size} strokeWidth={1.7} />
      </button>
    </div>
  );
}

function ChevronUpIcon({ size }: { size: number }) {
  return <ChevronDown size={size} strokeWidth={2} style={{ transform: "rotate(180deg)" }} />;
}
function ChevronDownIcon({ size }: { size: number }) {
  return <ChevronDown size={size} strokeWidth={2} />;
}

/** Header and footer are shared across every page, so they live in Settings. */
export function LockedRow({ label, hint, href }: { label: string; hint: string; href: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-lg px-2 py-2 text-[0.82rem] transition hover:bg-[var(--adm-bg)]"
    >
      <Lock size={12} strokeWidth={1.8} style={{ color: "var(--adm-muted)" }} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        <span className="block truncate text-[0.66rem]" style={{ color: "var(--adm-muted)" }}>
          {hint}
        </span>
      </span>
    </a>
  );
}
