"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Loader2, Search, Trash2, Upload, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export type MediaAsset = {
  id: string;
  url: string;
  filename: string;
  alt: string;
  folder: string;
  width: number | null;
  height: number | null;
};

/**
 * The media library, used both as a full page and as a picker dialog.
 * Drag-and-drop upload works anywhere inside the panel.
 */
export function MediaLibrary({
  onSelect,
  selectedUrls = [],
  multiple = false,
  showDelete = true,
  compact = false,
}: {
  onSelect?: (assets: MediaAsset[]) => void;
  selectedUrls?: string[];
  multiple?: boolean;
  showDelete?: boolean;
  compact?: boolean;
}) {
  const { show } = useToast();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [folder, setFolder] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [chosen, setChosen] = useState<string[]>(selectedUrls);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (folder) params.set("folder", folder);
    const response = await fetch(`/api/admin/media?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      setAssets(data.assets);
      setFolders(data.folders);
    }
    setLoading(false);
  }, [query, folder]);

  useEffect(() => {
    const timeout = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timeout);
  }, [load, query]);

  async function upload(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploading(true);
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    form.append("folder", folder || "Uploads");

    const response = await fetch("/api/admin/media", { method: "POST", body: form });
    const data = await response.json().catch(() => ({}));
    show(data.message ?? (response.ok ? "Uploaded." : "Upload failed."), response.ok ? "default" : "error");
    setUploading(false);
    if (response.ok) {
      await load();
      if (onSelect && data.assets?.length) {
        const uploaded: MediaAsset[] = data.assets;
        if (multiple) {
          const next = [...chosen, ...uploaded.map((a) => a.url)];
          setChosen(next);
          onSelect(uploaded);
        } else {
          onSelect([uploaded[0]]);
        }
      }
    }
  }

  function toggle(asset: MediaAsset) {
    if (!onSelect) return;
    if (multiple) {
      const next = chosen.includes(asset.url)
        ? chosen.filter((url) => url !== asset.url)
        : [...chosen, asset.url];
      setChosen(next);
      onSelect([asset]);
    } else {
      setChosen([asset.url]);
      onSelect([asset]);
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files.length) upload(event.dataTransfer.files);
      }}
      className="relative"
    >
      {dragging && (
        <div
          className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-xl border-2 border-dashed"
          style={{ borderColor: "var(--adm-accent)", background: "rgba(245,236,231,0.9)" }}
        >
          <p className="text-sm font-medium">Drop your images here</p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[10rem] flex-1">
          <Search size={15} strokeWidth={1.7} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--adm-muted)" }} />
          <label className="sr-only" htmlFor="media-search">Search images</label>
          <input
            id="media-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search images"
            className="adm-input pl-9"
            type="search"
          />
        </div>
        <label className="sr-only" htmlFor="media-folder">Folder</label>
        <select id="media-folder" value={folder} onChange={(event) => setFolder(event.target.value)} className="adm-input w-auto">
          <option value="">All folders</option>
          {folders.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} strokeWidth={1.7} />}
          Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) upload(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <p className="mb-3 text-xs" style={{ color: "var(--adm-muted)" }}>
        Drag images anywhere here to upload. Photos are resized and converted to WebP automatically, so you
        can upload straight from your phone.
      </p>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: "var(--adm-muted)" }} />
        </div>
      ) : assets.length === 0 ? (
        <div className="grid place-items-center rounded-xl border-2 border-dashed py-16" style={{ borderColor: "var(--adm-line)" }}>
          <ImagePlus size={26} strokeWidth={1.3} style={{ color: "var(--adm-muted)" }} />
          <p className="mt-3 text-sm font-medium">No images here yet</p>
          <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm mt-3" onClick={() => inputRef.current?.click()}>
            Choose files
          </button>
        </div>
      ) : (
        <div className={`grid gap-3 ${compact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6"}`}>
          {assets.map((asset) => {
            const selected = chosen.includes(asset.url);
            return (
              <div key={asset.id} className="group relative">
                <button
                  type="button"
                  onClick={() => toggle(asset)}
                  className="relative block w-full overflow-hidden rounded-lg"
                  style={{
                    aspectRatio: "1 / 1",
                    background: "var(--adm-bg)",
                    outline: selected ? "2px solid var(--adm-accent)" : "1px solid var(--adm-line)",
                    outlineOffset: selected ? "1px" : "0",
                    cursor: onSelect ? "pointer" : "default",
                  }}
                  aria-pressed={selected}
                  aria-label={asset.alt || asset.filename}
                >
                  <Image src={asset.url} alt="" fill sizes="150px" className="object-cover" />
                  {selected && (
                    <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full" style={{ background: "var(--adm-accent)", color: "#fff" }}>
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
                {showDelete && (
                  <button
                    type="button"
                    aria-label={`Delete ${asset.filename}`}
                    onClick={async () => {
                      if (!window.confirm("Remove this image from your library? Pages already using it keep working.")) return;
                      const response = await fetch(`/api/admin/media?id=${asset.id}`, { method: "DELETE" });
                      const data = await response.json().catch(() => ({}));
                      show(data.message ?? "Removed.", response.ok ? "default" : "error");
                      load();
                    }}
                    className="absolute left-1.5 top-1.5 hidden rounded-md p-1 group-hover:block"
                    style={{ background: "rgba(255,255,255,0.92)" }}
                  >
                    <Trash2 size={13} strokeWidth={1.7} />
                  </button>
                )}
                <p className="mt-1 truncate text-[0.68rem]" style={{ color: "var(--adm-muted)" }}>
                  {asset.filename}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** A single-image field with a preview and a "Choose image" dialog. */
export function ImageField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <span className="adm-label">{label}</span>
      <div className="flex items-start gap-3">
        <div
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg"
          style={{ background: "var(--adm-bg)", border: "1px solid var(--adm-line)" }}
        >
          {value ? (
            <Image src={value} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <span className="grid h-full place-items-center">
              <ImagePlus size={18} strokeWidth={1.4} style={{ color: "var(--adm-muted)" }} />
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap gap-2">
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => setOpen(true)}>
              {value ? "Change image" : "Choose image"}
            </button>
            {value && (
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => onChange("")}>
                Remove
              </button>
            )}
          </div>
          {hint && <p className="adm-hint">{hint}</p>}
        </div>
      </div>

      {open && (
        <MediaDialog
          title={label}
          onClose={() => setOpen(false)}
          onSelect={(assets) => {
            onChange(assets[0].url);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

export function MediaDialog({
  title,
  onClose,
  onSelect,
  multiple = false,
  selectedUrls = [],
}: {
  title: string;
  onClose: () => void;
  onSelect: (assets: MediaAsset[]) => void;
  multiple?: boolean;
  selectedUrls?: string[];
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" className="absolute inset-0" style={{ background: "rgba(46,42,38,0.5)" }} onClick={onClose} />
      <div className="adm relative flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl" style={{ background: "var(--adm-surface)" }}>
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--adm-line)" }}>
          <h2 className="text-lg">{title}</h2>
          <div className="flex items-center gap-2">
            {multiple && (
              <button type="button" className="adm-btn adm-btn-primary adm-btn-sm" onClick={onClose}>
                Done
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Close" className="p-1.5">
              <X size={18} strokeWidth={1.6} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <MediaLibrary onSelect={onSelect} multiple={multiple} selectedUrls={selectedUrls} showDelete={false} compact />
        </div>
      </div>
    </div>
  );
}
