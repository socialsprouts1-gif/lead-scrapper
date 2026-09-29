"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { deleteCategory, reorderCategories, saveCategory, toggleCategoryFeatured } from "@/app/actions/admin/categories";
import { ImageField } from "@/components/admin/MediaPicker";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";
import { slugify } from "@/lib/utils";

export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  parentId: string | null;
  isFeatured: boolean;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  productCount: number;
  children: CategoryNode[];
};

type Draft = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  parentId: string;
  isFeatured: boolean;
  isActive: boolean;
  seoTitle: string;
  seoDescription: string;
};

const BLANK: Draft = {
  name: "", slug: "", description: "", imageUrl: "", imageAlt: "",
  parentId: "", isFeatured: true, isActive: true, seoTitle: "", seoDescription: "",
};

export function CategoryManager({ tree }: { tree: CategoryNode[] }) {
  const router = useRouter();
  const { show } = useToast();
  const [order, setOrder] = useState(tree);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, start] = useTransition();

  // Re-sync with the server after a refresh, without an effect.
  const [syncedTree, setSyncedTree] = useState(tree);
  if (syncedTree !== tree) {
    setSyncedTree(tree);
    setOrder(tree);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const flat = tree.flatMap((node) => [node, ...node.children]);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((node) => node.id === active.id);
    const newIndex = order.findIndex((node) => node.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    start(async () => {
      const result = await reorderCategories(next.map((node) => node.id));
      if (!result.ok) show(result.message ?? "Could not save the order.", "error");
      router.refresh();
    });
  }

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const result = await action();
      if (result.message) show(result.message, result.ok ? "default" : "error");
      if (result.ok) {
        setDraft(null);
        router.refresh();
      }
    });
  }

  function toDraft(node: CategoryNode): Draft {
    return {
      id: node.id,
      name: node.name,
      slug: node.slug,
      description: node.description ?? "",
      imageUrl: node.imageUrl ?? "",
      imageAlt: node.imageAlt ?? "",
      parentId: node.parentId ?? "",
      isFeatured: node.isFeatured,
      isActive: node.isActive,
      seoTitle: node.seoTitle ?? "",
      seoDescription: node.seoDescription ?? "",
    };
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
      <div className="adm-card p-2">
        <DndContext id="category-order" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order.map((node) => node.id)} strategy={verticalListSortingStrategy}>
            <ul>
              {order.map((node) => (
                <SortableCategory
                  key={node.id}
                  node={node}
                  onEdit={() => setDraft(toDraft(node))}
                  onEditChild={(child) => setDraft(toDraft(child))}
                  onDelete={(id, name) => {
                    if (!window.confirm(`Delete "${name}"? Products in it are kept but lose their category.`)) return;
                    run(() => deleteCategory(id));
                  }}
                  onFeature={(id, featured) => run(() => toggleCategoryFeatured(id, featured))}
                  onAddChild={() => setDraft({ ...BLANK, parentId: node.id })}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {pending && (
          <p className="flex items-center gap-2 px-4 py-2 text-xs" style={{ color: "var(--adm-muted)" }}>
            <Spinner size={12} /> Saving…
          </p>
        )}
      </div>

      <div className="adm-card p-6 lg:sticky lg:top-6">
        {draft ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              run(() => saveCategory(draft, draft.id));
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg">{draft.id ? "Edit category" : "New category"}</h2>
              <button type="button" className="text-sm underline underline-offset-2" onClick={() => setDraft(null)}>
                Cancel
              </button>
            </div>

            <label className="block">
              <span className="adm-label">Name</span>
              <input className="adm-input" value={draft.name} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </label>

            <label className="block">
              <span className="adm-label">Sits inside</span>
              <select className="adm-input" value={draft.parentId} onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}>
                <option value="">Top level</option>
                {tree
                  .filter((node) => node.id !== draft.id)
                  .map((node) => (
                    <option key={node.id} value={node.id}>{node.name}</option>
                  ))}
              </select>
            </label>

            <label className="block">
              <span className="adm-label">Web address</span>
              <div className="flex items-center gap-1 text-sm">
                <span style={{ color: "var(--adm-muted)" }}>/categories/</span>
                <input
                  className="adm-input"
                  value={draft.slug}
                  placeholder={slugify(draft.name)}
                  onChange={(e) => setDraft({ ...draft, slug: slugify(e.target.value) })}
                />
              </div>
            </label>

            <label className="block">
              <span className="adm-label">Description</span>
              <textarea rows={3} className="adm-input" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </label>

            <ImageField
              label="Category image"
              value={draft.imageUrl}
              onChange={(url) => setDraft({ ...draft, imageUrl: url })}
              hint="Shown on the homepage and category pages."
            />

            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={draft.isFeatured} onChange={(e) => setDraft({ ...draft, isFeatured: e.target.checked })} />
              Show on the homepage
            </label>
            <label className="flex items-center gap-2.5 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
              Visible to customers
            </label>

            <details>
              <summary className="cursor-pointer text-sm" style={{ color: "var(--adm-muted)" }}>SEO (optional)</summary>
              <div className="mt-3 space-y-3">
                <label className="block">
                  <span className="adm-label">Page title</span>
                  <input className="adm-input" value={draft.seoTitle} onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })} />
                </label>
                <label className="block">
                  <span className="adm-label">Description</span>
                  <textarea rows={2} className="adm-input" value={draft.seoDescription} onChange={(e) => setDraft({ ...draft, seoDescription: e.target.value })} />
                </label>
              </div>
            </details>

            <button type="submit" className="adm-btn adm-btn-primary w-full" disabled={pending}>
              {pending ? <Spinner size={14} /> : null} Save category
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-lg">Categories</p>
            <p className="mx-auto mt-2 max-w-xs text-sm" style={{ color: "var(--adm-muted)" }}>
              Drag the handles on the left to change the order they appear in on your shop. Click the pencil to
              edit one.
            </p>
            <button type="button" className="adm-btn adm-btn-primary mt-5" onClick={() => setDraft(BLANK)}>
              <Plus size={15} strokeWidth={1.8} /> New category
            </button>
            <p className="mt-4 text-xs" style={{ color: "var(--adm-muted)" }}>
              {flat.length} categories in total
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SortableCategory({
  node,
  onEdit,
  onEditChild,
  onDelete,
  onFeature,
  onAddChild,
}: {
  node: CategoryNode;
  onEdit: () => void;
  onEditChild: (child: CategoryNode) => void;
  onDelete: (id: string, name: string) => void;
  onFeature: (id: string, featured: boolean) => void;
  onAddChild: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.55 : 1 }}
      className="rounded-xl"
    >
      <div className="flex items-center gap-3 px-2 py-2.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${node.name}`}
          className="cursor-grab rounded-md p-1 active:cursor-grabbing"
          style={{ color: "var(--adm-muted)" }}
        >
          <GripVertical size={16} strokeWidth={1.7} />
        </button>

        <div className="relative h-11 w-10 shrink-0 overflow-hidden rounded-md" style={{ background: "var(--adm-bg)" }}>
          {node.imageUrl && <Image src={node.imageUrl} alt="" fill sizes="44px" className="object-cover" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {node.name}
            {!node.isActive && (
              <span className="adm-pill ml-2" style={{ background: "#eeeae5", color: "#6b6058" }}>Hidden</span>
            )}
          </p>
          <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
            /{node.slug} · {node.productCount} {node.productCount === 1 ? "product" : "products"}
            {node.children.length > 0 ? ` · ${node.children.length} subcategories` : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => onFeature(node.id, !node.isFeatured)}
            aria-label={node.isFeatured ? `Hide ${node.name} from homepage` : `Show ${node.name} on homepage`}
            title={node.isFeatured ? "Shown on homepage" : "Not on homepage"}
            className="rounded-md p-1.5"
            style={{ color: node.isFeatured ? "#b4762f" : "var(--adm-muted)" }}
          >
            <Star size={15} strokeWidth={1.7} className={node.isFeatured ? "fill-current" : ""} />
          </button>
          <button type="button" onClick={onAddChild} aria-label={`Add a subcategory in ${node.name}`} className="rounded-md p-1.5">
            <Plus size={15} strokeWidth={1.7} />
          </button>
          <button type="button" onClick={onEdit} aria-label={`Edit ${node.name}`} className="rounded-md p-1.5">
            <Pencil size={15} strokeWidth={1.7} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id, node.name)}
            aria-label={`Delete ${node.name}`}
            className="rounded-md p-1.5"
            style={{ color: "#9c3a3a" }}
          >
            <Trash2 size={15} strokeWidth={1.7} />
          </button>
        </div>
      </div>

      {node.children.length > 0 && (
        <ul className="ml-10 border-l pl-3" style={{ borderColor: "var(--adm-line)" }}>
          {node.children.map((child) => (
            <li key={child.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {child.name}
                  {!child.isActive && (
                    <span className="adm-pill ml-2" style={{ background: "#eeeae5", color: "#6b6058" }}>Hidden</span>
                  )}
                </p>
                <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
                  /{child.slug} · {child.productCount} {child.productCount === 1 ? "product" : "products"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onFeature(child.id, !child.isFeatured)}
                aria-label={child.isFeatured ? `Hide ${child.name} from homepage` : `Show ${child.name} on homepage`}
                className="rounded-md p-1.5"
                style={{ color: child.isFeatured ? "#b4762f" : "var(--adm-muted)" }}
              >
                {child.isFeatured ? <Eye size={14} strokeWidth={1.7} /> : <EyeOff size={14} strokeWidth={1.7} />}
              </button>
              <button type="button" onClick={() => onEditChild(child)} aria-label={`Edit ${child.name}`} className="rounded-md p-1.5">
                <Pencil size={14} strokeWidth={1.7} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(child.id, child.name)}
                aria-label={`Delete ${child.name}`}
                className="rounded-md p-1.5"
                style={{ color: "#9c3a3a" }}
              >
                <Trash2 size={14} strokeWidth={1.7} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
