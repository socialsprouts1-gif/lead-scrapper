"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { FieldDef } from "@/lib/sections";
import { ImageField } from "@/components/admin/MediaPicker";
import { ProductPicker } from "@/components/admin/ProductPicker";

export type PickerData = {
  categories: { id: string; name: string; parentId: string | null }[];
};

/**
 * Renders one editable field from the block registry. Adding a new field type
 * here is the only change needed to support a new kind of setting.
 */
export function SectionField({
  field,
  value,
  onChange,
  data,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  data: PickerData;
}) {
  const id = `field-${field.key}`;

  switch (field.type) {
    case "text":
      return (
        <Wrap field={field} id={id}>
          <input
            id={id}
            className="adm-input"
            value={String(value ?? "")}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
        </Wrap>
      );

    case "link":
      return (
        <Wrap field={field} id={id}>
          <input
            id={id}
            className="adm-input"
            value={String(value ?? "")}
            placeholder="/shop"
            onChange={(event) => onChange(event.target.value)}
          />
        </Wrap>
      );

    case "textarea":
    case "richtext":
      return (
        <Wrap field={field} id={id}>
          <textarea
            id={id}
            rows={field.type === "richtext" ? 8 : 3}
            className="adm-input"
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
          />
        </Wrap>
      );

    case "number":
      return (
        <Wrap field={field} id={id}>
          <input
            id={id}
            className="adm-input"
            inputMode="numeric"
            value={String(value ?? "")}
            onChange={(event) => {
              const next = Number(event.target.value.replace(/[^\d.-]/g, ""));
              onChange(Number.isFinite(next) ? next : 0);
            }}
          />
        </Wrap>
      );

    case "color":
      return (
        <Wrap field={field} id={id}>
          <div className="flex items-center gap-2">
            <input
              id={id}
              type="color"
              className="h-9 w-14 cursor-pointer rounded border"
              style={{ borderColor: "var(--adm-line)" }}
              value={String(value ?? "#ffffff")}
              onChange={(event) => onChange(event.target.value)}
            />
            <input
              className="adm-input"
              value={String(value ?? "")}
              onChange={(event) => onChange(event.target.value)}
              aria-label={`${field.label} hex value`}
            />
          </div>
        </Wrap>
      );

    case "toggle":
      return (
        <label className="flex items-center gap-2.5 py-1 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
          />
          {field.label}
        </label>
      );

    case "select":
      return (
        <Wrap field={field} id={id}>
          <select id={id} className="adm-input" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Wrap>
      );

    case "category":
      return (
        <Wrap field={field} id={id}>
          <select id={id} className="adm-input" value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
            <option value="">Choose a category</option>
            {data.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.parentId ? `— ${category.name}` : category.name}
              </option>
            ))}
          </select>
        </Wrap>
      );

    case "image":
      return (
        <ImageField
          label={field.label}
          value={String(value ?? "")}
          onChange={(url) => onChange(url)}
          hint={field.help}
        />
      );

    case "products":
      return (
        <div>
          <span className="adm-label">{field.label}</span>
          <ProductPicker
            selected={Array.isArray(value) ? (value as string[]) : []}
            onChange={(ids) => onChange(ids)}
          />
          {field.help && <span className="adm-hint block">{field.help}</span>}
        </div>
      );

    case "repeater":
      return (
        <Repeater
          field={field}
          items={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          onChange={(items) => onChange(items)}
          data={data}
        />
      );

    default:
      return null;
  }
}

function Wrap({ field, id, children }: { field: FieldDef; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="adm-label" htmlFor={id}>{field.label}</label>
      {children}
      {"help" in field && field.help && <span className="adm-hint block">{field.help}</span>}
    </div>
  );
}

function Repeater({
  field,
  items,
  onChange,
  data,
}: {
  field: Extract<FieldDef, { type: "repeater" }>;
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
  data: PickerData;
}) {
  const [open, setOpen] = useState<number | null>(0);

  function blank(): Record<string, unknown> {
    const entry: Record<string, unknown> = {};
    for (const sub of field.fields) entry[sub.key] = sub.type === "number" ? 0 : "";
    return entry;
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setOpen(target);
  }

  return (
    <div>
      <span className="adm-label">{field.label}</span>
      <div className="space-y-2">
        {items.map((item, index) => {
          const title =
            String(item.title ?? item.question ?? item.name ?? item.heading ?? "") ||
            `${field.itemLabel} ${index + 1}`;
          return (
            <div key={index} className="rounded-lg" style={{ background: "var(--adm-bg)" }}>
              <div className="flex items-center gap-1 px-3 py-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-left text-sm"
                  onClick={() => setOpen(open === index ? null : index)}
                >
                  {title}
                </button>
                <button type="button" onClick={() => move(index, -1)} aria-label="Move up" className="rounded p-1" disabled={index === 0}>
                  <ChevronUp size={14} strokeWidth={1.8} style={{ opacity: index === 0 ? 0.3 : 1 }} />
                </button>
                <button type="button" onClick={() => move(index, 1)} aria-label="Move down" className="rounded p-1" disabled={index === items.length - 1}>
                  <ChevronDown size={14} strokeWidth={1.8} style={{ opacity: index === items.length - 1 ? 0.3 : 1 }} />
                </button>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  aria-label={`Remove ${title}`}
                  className="rounded p-1"
                  style={{ color: "#9c3a3a" }}
                >
                  <Trash2 size={14} strokeWidth={1.7} />
                </button>
              </div>

              {open === index && (
                <div className="space-y-3 border-t px-3 py-3" style={{ borderColor: "var(--adm-line)" }}>
                  {field.fields.map((sub) => (
                    <SectionField
                      key={sub.key}
                      field={sub}
                      value={item[sub.key]}
                      data={data}
                      onChange={(next) => {
                        const copy = [...items];
                        copy[index] = { ...copy[index], [sub.key]: next };
                        onChange(copy);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(!field.max || items.length < field.max) && (
        <button
          type="button"
          className="adm-btn adm-btn-ghost adm-btn-sm mt-2"
          onClick={() => {
            onChange([...items, blank()]);
            setOpen(items.length);
          }}
        >
          <Plus size={14} strokeWidth={1.8} /> Add {field.itemLabel.toLowerCase()}
        </button>
      )}
      {field.help && <span className="adm-hint block">{field.help}</span>}
    </div>
  );
}
