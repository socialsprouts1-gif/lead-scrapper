"use client";

import { useState } from "react";
import {
  DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react";
import type { MenuItem, MenuLink, SiteSettings } from "@/lib/site-settings";
import { ImageField } from "@/components/admin/MediaPicker";

/**
 * The header and footer belong to every page, so they are not part of a page's
 * draft: editing them here changes the live site as soon as it saves. The
 * editor says so above these panels.
 */

type Patch = (next: SiteSettings) => void;

/* -------------------------------------------------------------------------- */
/* A small sortable list, reused for menu items, dropdown links and columns.   */
/* -------------------------------------------------------------------------- */

function SortableList<T>({
  scope,
  items,
  onReorder,
  renderRow,
}: {
  scope: string;
  items: T[];
  onReorder: (from: number, to: number) => void;
  renderRow: (item: T, index: number, handle: React.ReactNode) => React.ReactNode;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = items.map((_, index) => `${scope}-${index}`);

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(from, to);
  }

  return (
    <DndContext id={scope} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1.5">
          {items.map((item, index) => (
            <SortableRow key={ids[index]} id={ids[index]}>
              {(handle) => renderRow(item, index, handle)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (handle: React.ReactNode) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder"
      className="cursor-grab rounded p-1 opacity-45 transition hover:opacity-100 active:cursor-grabbing"
      style={{ color: "var(--adm-muted)" }}
    >
      <GripVertical size={14} strokeWidth={1.8} />
    </button>
  );
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}
    >
      {children(handle)}
    </li>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg" style={{ background: "var(--adm-bg)" }}>
      {children}
    </div>
  );
}

/** Wrapping the control in the label associates the two without an id. */
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="adm-label">{label}</span>
      {children}
      {hint && <span className="adm-hint block">{hint}</span>}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 py-1 text-sm">
      <input
        type="checkbox"
        className="h-4 w-4"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

/* -------------------------------------------------------------------------- */
/* Header                                                                     */
/* -------------------------------------------------------------------------- */

export function HeaderPanel({
  settings,
  patch,
}: {
  settings: SiteSettings;
  patch: Patch;
}) {
  const [openItem, setOpenItem] = useState<number | null>(null);
  const menu = settings.header.menu;

  function setMenu(next: MenuItem[]) {
    patch({ ...settings, header: { ...settings.header, menu: next } });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Logo</h3>
        <ImageField
          label="Logo image"
          value={settings.logoUrl ?? ""}
          onChange={(url) => patch({ ...settings, logoUrl: url || null })}
          hint="Leave empty to show the shop's name as text."
        />
        <Field label="Logo width (px)">
          <input
            className="adm-input"
            inputMode="numeric"
            value={settings.logoWidth}
            onChange={(event) =>
              patch({ ...settings, logoWidth: Math.max(Number(event.target.value) || 0, 40) })
            }
          />
        </Field>
      </section>

      <section className="space-y-1 border-t pt-4" style={{ borderColor: "var(--adm-line)" }}>
        <h3 className="mb-1 text-sm font-medium">Announcement bar</h3>
        <Toggle
          label="Show the strip above the header"
          checked={settings.announcement.enabled}
          onChange={(value) =>
            patch({ ...settings, announcement: { ...settings.announcement, enabled: value } })
          }
        />
        {settings.announcement.enabled && (
          <div className="space-y-3 pt-2">
            <Field label="Message">
              <input
                className="adm-input"
                value={settings.announcement.text}
                onChange={(event) =>
                  patch({ ...settings, announcement: { ...settings.announcement, text: event.target.value } })
                }
              />
            </Field>
            <Field label="Links to">
              <input
                className="adm-input"
                value={settings.announcement.link}
                onChange={(event) =>
                  patch({ ...settings, announcement: { ...settings.announcement, link: event.target.value } })
                }
              />
            </Field>
          </div>
        )}
      </section>

      <section className="space-y-1 border-t pt-4" style={{ borderColor: "var(--adm-line)" }}>
        <h3 className="mb-1 text-sm font-medium">Icons</h3>
        <Toggle
          label="Search"
          checked={settings.header.showSearch}
          onChange={(value) => patch({ ...settings, header: { ...settings.header, showSearch: value } })}
        />
        <Toggle
          label="Wishlist"
          checked={settings.header.showWishlist}
          onChange={(value) => patch({ ...settings, header: { ...settings.header, showWishlist: value } })}
        />
        <Toggle
          label="Bag"
          checked={settings.header.showCart}
          onChange={(value) => patch({ ...settings, header: { ...settings.header, showCart: value } })}
        />
      </section>

      <section className="border-t pt-4" style={{ borderColor: "var(--adm-line)" }}>
        <h3 className="mb-1 text-sm font-medium">Menu</h3>
        <p className="adm-hint mb-3">
          Drag to reorder. Open an item to add dropdown links under it.
        </p>

        <SortableList
          scope="header-menu"
          items={menu}
          onReorder={(from, to) => {
            setMenu(arrayMove(menu, from, to));
            setOpenItem(null);
          }}
          renderRow={(item, index, handle) => (
            <Row>
              <div className="flex items-center gap-1 px-1.5 py-1.5">
                {handle}
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm"
                  onClick={() => setOpenItem(openItem === index ? null : index)}
                >
                  {item.label || "Untitled link"}
                  {item.children && item.children.length > 0 && (
                    <span className="ml-1.5 text-[0.66rem]" style={{ color: "var(--adm-muted)" }}>
                      · {item.children.length} sub-links
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={openItem === index ? "Close" : "Edit"}
                  className="rounded p-1"
                  onClick={() => setOpenItem(openItem === index ? null : index)}
                >
                  {openItem === index ? <ChevronDown size={14} strokeWidth={2} /> : <ChevronRight size={14} strokeWidth={2} />}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${item.label}`}
                  className="rounded p-1"
                  style={{ color: "#9c3a3a" }}
                  onClick={() => {
                    setMenu(menu.filter((_, i) => i !== index));
                    setOpenItem(null);
                  }}
                >
                  <Trash2 size={14} strokeWidth={1.7} />
                </button>
              </div>

              {openItem === index && (
                <div className="space-y-3 border-t px-3 py-3" style={{ borderColor: "var(--adm-line)" }}>
                  <Field label="Label">
                    <input
                      className="adm-input"
                      value={item.label}
                      onChange={(event) =>
                        setMenu(menu.map((entry, i) => (i === index ? { ...entry, label: event.target.value } : entry)))
                      }
                    />
                  </Field>
                  <Field label="Links to" hint="A path like /shop, or a full web address.">
                    <input
                      className="adm-input"
                      value={item.href}
                      onChange={(event) =>
                        setMenu(menu.map((entry, i) => (i === index ? { ...entry, href: event.target.value } : entry)))
                      }
                    />
                  </Field>

                  <LinkList
                    scope={`header-sub-${index}`}
                    label="Dropdown links"
                    hint="Leave empty to show the category's own sub-categories."
                    links={item.children ?? []}
                    onChange={(children) =>
                      setMenu(menu.map((entry, i) => (i === index ? { ...entry, children } : entry)))
                    }
                  />
                </div>
              )}
            </Row>
          )}
        />

        <button
          type="button"
          className="adm-btn adm-btn-ghost adm-btn-sm mt-2"
          onClick={() => {
            setMenu([...menu, { label: "New link", href: "/shop" }]);
            setOpenItem(menu.length);
          }}
        >
          <Plus size={13} strokeWidth={2} /> Add menu item
        </button>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Footer                                                                     */
/* -------------------------------------------------------------------------- */

export function FooterPanel({
  settings,
  patch,
}: {
  settings: SiteSettings;
  patch: Patch;
}) {
  const [openColumn, setOpenColumn] = useState<number | null>(0);
  const columns = settings.footer.columns;

  function setColumns(next: SiteSettings["footer"]["columns"]) {
    patch({ ...settings, footer: { ...settings.footer, columns: next } });
  }

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <Field label="About text">
          <textarea
            rows={4}
            className="adm-input"
            value={settings.footer.about}
            onChange={(event) =>
              patch({ ...settings, footer: { ...settings.footer, about: event.target.value } })
            }
          />
        </Field>
        <Field label="Copyright line">
          <input
            className="adm-input"
            value={settings.footer.copyright}
            onChange={(event) =>
              patch({ ...settings, footer: { ...settings.footer, copyright: event.target.value } })
            }
          />
        </Field>
      </section>

      <section className="space-y-3 border-t pt-4" style={{ borderColor: "var(--adm-line)" }}>
        <h3 className="text-sm font-medium">Social links</h3>
        {(["instagram", "facebook", "youtube", "pinterest"] as const).map((key) => (
          <Field key={key} label={key[0].toUpperCase() + key.slice(1)}>
            <input
              className="adm-input"
              placeholder="https://…"
              value={settings.social[key]}
              onChange={(event) =>
                patch({ ...settings, social: { ...settings.social, [key]: event.target.value } })
              }
            />
          </Field>
        ))}
      </section>

      <section className="border-t pt-4" style={{ borderColor: "var(--adm-line)" }}>
        <h3 className="mb-1 text-sm font-medium">Link columns</h3>
        <p className="adm-hint mb-3">Drag a column to move it. Open one to edit its links.</p>

        <SortableList
          scope="footer-columns"
          items={columns}
          onReorder={(from, to) => {
            setColumns(arrayMove(columns, from, to));
            setOpenColumn(null);
          }}
          renderRow={(column, index, handle) => (
            <Row>
              <div className="flex items-center gap-1 px-1.5 py-1.5">
                {handle}
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm"
                  onClick={() => setOpenColumn(openColumn === index ? null : index)}
                >
                  {column.title || "Untitled column"}
                  <span className="ml-1.5 text-[0.66rem]" style={{ color: "var(--adm-muted)" }}>
                    · {column.links.length} links
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${column.title}`}
                  className="rounded p-1"
                  style={{ color: "#9c3a3a" }}
                  onClick={() => {
                    setColumns(columns.filter((_, i) => i !== index));
                    setOpenColumn(null);
                  }}
                >
                  <Trash2 size={14} strokeWidth={1.7} />
                </button>
              </div>

              {openColumn === index && (
                <div className="space-y-3 border-t px-3 py-3" style={{ borderColor: "var(--adm-line)" }}>
                  <Field label="Column title">
                    <input
                      className="adm-input"
                      value={column.title}
                      onChange={(event) =>
                        setColumns(
                          columns.map((entry, i) => (i === index ? { ...entry, title: event.target.value } : entry)),
                        )
                      }
                    />
                  </Field>
                  <LinkList
                    scope={`footer-links-${index}`}
                    label="Links"
                    links={column.links}
                    onChange={(links) =>
                      setColumns(columns.map((entry, i) => (i === index ? { ...entry, links } : entry)))
                    }
                  />
                </div>
              )}
            </Row>
          )}
        />

        <button
          type="button"
          className="adm-btn adm-btn-ghost adm-btn-sm mt-2"
          onClick={() => {
            setColumns([...columns, { title: "New column", links: [] }]);
            setOpenColumn(columns.length);
          }}
        >
          <Plus size={13} strokeWidth={2} /> Add column
        </button>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function LinkList({
  scope,
  label,
  hint,
  links,
  onChange,
}: {
  scope: string;
  label: string;
  hint?: string;
  links: MenuLink[];
  onChange: (links: MenuLink[]) => void;
}) {
  return (
    <div>
      <span className="adm-label">{label}</span>
      {hint && <span className="adm-hint mb-2 block">{hint}</span>}

      <SortableList
        scope={scope}
        items={links}
        onReorder={(from, to) => onChange(arrayMove(links, from, to))}
        renderRow={(link, index, handle) => (
          <div className="flex items-center gap-1 rounded-lg px-1 py-1" style={{ background: "var(--adm-surface)" }}>
            {handle}
            <input
              className="adm-input h-8 min-w-0 flex-1 py-0 text-xs"
              aria-label={`Link ${index + 1} label`}
              placeholder="Label"
              value={link.label}
              onChange={(event) =>
                onChange(links.map((entry, i) => (i === index ? { ...entry, label: event.target.value } : entry)))
              }
            />
            <input
              className="adm-input h-8 min-w-0 flex-1 py-0 text-xs"
              aria-label={`Link ${index + 1} address`}
              placeholder="/shop"
              value={link.href}
              onChange={(event) =>
                onChange(links.map((entry, i) => (i === index ? { ...entry, href: event.target.value } : entry)))
              }
            />
            <button
              type="button"
              aria-label={`Remove ${link.label || `link ${index + 1}`}`}
              className="shrink-0 rounded p-1"
              style={{ color: "#9c3a3a" }}
              onClick={() => onChange(links.filter((_, i) => i !== index))}
            >
              <Trash2 size={13} strokeWidth={1.7} />
            </button>
          </div>
        )}
      />

      <button
        type="button"
        className="adm-btn adm-btn-ghost adm-btn-sm mt-2"
        onClick={() => onChange([...links, { label: "New link", href: "/shop" }])}
      >
        <Plus size={12} strokeWidth={2} /> Add link
      </button>
    </div>
  );
}
