"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Monitor, RotateCcw, Smartphone } from "lucide-react";
import { discardThemeDraft, updateTheme } from "@/app/actions/admin/settings";
import { DEFAULT_THEME, FONT_OPTIONS, type ThemeSettings } from "@/lib/theme";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

const PALETTES: { name: string; colors: ThemeSettings["colors"] }[] = [
  {
    name: "Blush & clay",
    colors: DEFAULT_THEME.colors,
  },
  {
    name: "Ivory & ink",
    colors: {
      primary: "#6f6a63", secondary: "#eeeae2", background: "#fbfaf7", surface: "#ffffff",
      text: "#23211e", muted: "#7c766e", button: "#23211e", buttonText: "#fbfaf7", border: "#e6e2d9",
    },
  },
  {
    name: "Rose & cream",
    colors: {
      primary: "#b1737c", secondary: "#f7e3e5", background: "#fffaf9", surface: "#ffffff",
      text: "#3a2b2d", muted: "#8b7477", button: "#8d4d58", buttonText: "#fffaf9", border: "#f0e0e1",
    },
  },
  {
    name: "Sage & sand",
    colors: {
      primary: "#7d8c72", secondary: "#e7ece1", background: "#fbfaf6", surface: "#ffffff",
      text: "#2c302a", muted: "#7b8076", button: "#414a3c", buttonText: "#fbfaf6", border: "#e3e6dc",
    },
  },
];

const TABS = [
  { id: "colours", label: "Colours" },
  { id: "type", label: "Typography" },
  { id: "buttons", label: "Buttons" },
  { id: "layout", label: "Layout" },
] as const;

export function AppearanceEditor({
  initial,
  hasDraft,
}: {
  initial: ThemeSettings;
  hasDraft: boolean;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [theme, setTheme] = useState<ThemeSettings>(initial);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("colours");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [dirty, setDirty] = useState(hasDraft);
  const [pending, start] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function reloadPreview() {
    const frame = iframeRef.current;
    if (frame) frame.src = `/preview/home?theme=draft&t=${Date.now()}`;
  }

  /** Every change is written to the draft theme, which only the preview reads. */
  function patch(update: Partial<ThemeSettings>) {
    const next = { ...theme, ...update };
    setTheme(next);
    setDirty(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await updateTheme(next, "draft");
      reloadPreview();
    }, 450);
  }

  return (
    <div className="flex h-[calc(100vh-3.25rem)] flex-col lg:h-screen" style={{ background: "var(--adm-bg)" }}>
      <header
        className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
      >
        <div>
          <p className="text-sm font-medium">Appearance</p>
          <p className="text-xs" style={{ color: "var(--adm-muted)" }}>
            {dirty ? "Preview only — press Apply to change your live shop" : "Your shop matches this"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg p-0.5" style={{ background: "var(--adm-bg)" }}>
            <button type="button" onClick={() => setDevice("desktop")} aria-label="Desktop preview" aria-pressed={device === "desktop"} className="rounded-md p-1.5" style={{ background: device === "desktop" ? "var(--adm-surface)" : "transparent" }}>
              <Monitor size={15} strokeWidth={1.7} />
            </button>
            <button type="button" onClick={() => setDevice("mobile")} aria-label="Mobile preview" aria-pressed={device === "mobile"} className="rounded-md p-1.5" style={{ background: device === "mobile" ? "var(--adm-surface)" : "transparent" }}>
              <Smartphone size={15} strokeWidth={1.7} />
            </button>
          </div>

          <button
            type="button"
            className="adm-btn adm-btn-ghost adm-btn-sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Go back to the standard Hairtie look?")) return;
              patch(DEFAULT_THEME);
              show("Reset to the original look — press Apply to make it live.");
            }}
          >
            <RotateCcw size={14} strokeWidth={1.7} /> Reset
          </button>

          {dirty && (
            <button
              type="button"
              className="adm-btn adm-btn-ghost adm-btn-sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const result = await discardThemeDraft();
                  show(result.message ?? "", result.ok ? "default" : "error");
                  setTheme(initial);
                  setDirty(false);
                  reloadPreview();
                  router.refresh();
                })
              }
            >
              Discard
            </button>
          )}

          <button
            type="button"
            className="adm-btn adm-btn-primary adm-btn-sm"
            disabled={pending || !dirty}
            onClick={() =>
              start(async () => {
                const result = await updateTheme(theme, "publish");
                show(result.message ?? "", result.ok ? "default" : "error");
                if (result.ok) {
                  setDirty(false);
                  router.refresh();
                }
              })
            }
          >
            {pending ? <Spinner size={13} /> : null}
            {dirty ? "Apply to my shop" : "Applied"}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside
          className="w-full shrink-0 overflow-y-auto border-b lg:w-80 lg:border-b-0 lg:border-r"
          style={{ borderColor: "var(--adm-line)", background: "var(--adm-surface)" }}
        >
          <div className="flex gap-1 border-b p-2" style={{ borderColor: "var(--adm-line)" }} role="tablist">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                role="tab"
                aria-selected={tab === entry.id}
                onClick={() => setTab(entry.id)}
                className="flex-1 rounded-lg px-2 py-1.5 text-xs"
                style={{
                  background: tab === entry.id ? "var(--adm-accent-soft)" : "transparent",
                  color: tab === entry.id ? "var(--adm-accent)" : "var(--adm-muted)",
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="space-y-5 p-4">
            {tab === "colours" && (
              <>
                <div>
                  <span className="adm-label">Ready-made palettes</span>
                  <div className="grid grid-cols-2 gap-2">
                    {PALETTES.map((palette) => (
                      <button
                        key={palette.name}
                        type="button"
                        className="rounded-lg p-2 text-left transition hover:border-[var(--adm-accent)]"
                        style={{ border: "1px solid var(--adm-line)" }}
                        onClick={() => patch({ colors: palette.colors })}
                      >
                        <span className="mb-1.5 flex gap-1">
                          {[palette.colors.background, palette.colors.secondary, palette.colors.primary, palette.colors.button].map((color) => (
                            <span key={color} className="h-4 w-4 rounded-full" style={{ background: color, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }} />
                          ))}
                        </span>
                        <span className="text-xs">{palette.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {([
                  ["background", "Page background"],
                  ["surface", "Card background"],
                  ["text", "Text"],
                  ["muted", "Quiet text"],
                  ["primary", "Accent"],
                  ["secondary", "Soft accent"],
                  ["button", "Button background"],
                  ["buttonText", "Button text"],
                  ["border", "Lines & borders"],
                ] as const).map(([key, label]) => (
                  <ColorRow
                    key={key}
                    label={label}
                    value={theme.colors[key]}
                    onChange={(value) => patch({ colors: { ...theme.colors, [key]: value } })}
                  />
                ))}
              </>
            )}

            {tab === "type" && (
              <>
                <label className="block">
                  <span className="adm-label">Heading font</span>
                  <select
                    className="adm-input"
                    value={theme.typography.headingFont}
                    onChange={(event) => patch({ typography: { ...theme.typography, headingFont: event.target.value } })}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.id} value={font.id}>{font.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="adm-label">Body font</span>
                  <select
                    className="adm-input"
                    value={theme.typography.bodyFont}
                    onChange={(event) => patch({ typography: { ...theme.typography, bodyFont: event.target.value } })}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font.id} value={font.id}>{font.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="adm-label">Heading weight</span>
                  <select
                    className="adm-input"
                    value={theme.typography.headingWeight}
                    onChange={(event) => patch({ typography: { ...theme.typography, headingWeight: event.target.value } })}
                  >
                    <option value="300">Light</option>
                    <option value="400">Regular</option>
                    <option value="500">Medium</option>
                    <option value="600">Semibold</option>
                  </select>
                </label>
                <Range
                  label="Base text size"
                  min={14}
                  max={19}
                  value={theme.typography.baseSize}
                  suffix="px"
                  onChange={(value) => patch({ typography: { ...theme.typography, baseSize: value } })}
                />
              </>
            )}

            {tab === "buttons" && (
              <>
                <label className="block">
                  <span className="adm-label">Shape</span>
                  <select
                    className="adm-input"
                    value={theme.buttons.shape}
                    onChange={(event) => patch({ buttons: { ...theme.buttons, shape: event.target.value as ThemeSettings["buttons"]["shape"] } })}
                  >
                    <option value="square">Square</option>
                    <option value="soft">Slightly rounded</option>
                    <option value="rounded">Rounded</option>
                    <option value="pill">Pill</option>
                  </select>
                </label>
                <label className="block">
                  <span className="adm-label">Size</span>
                  <select
                    className="adm-input"
                    value={theme.buttons.size}
                    onChange={(event) => patch({ buttons: { ...theme.buttons, size: event.target.value as ThemeSettings["buttons"]["size"] } })}
                  >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                </label>
              </>
            )}

            {tab === "layout" && (
              <>
                <Range
                  label="Page width"
                  min={1040}
                  max={1600}
                  step={40}
                  value={theme.layout.contentWidth}
                  suffix="px"
                  onChange={(value) => patch({ layout: { ...theme.layout, contentWidth: value } })}
                />
                <label className="block">
                  <span className="adm-label">Products per row (desktop)</span>
                  <select
                    className="adm-input"
                    value={String(theme.layout.productColumns)}
                    onChange={(event) => patch({ layout: { ...theme.layout, productColumns: Number(event.target.value) as 2 | 3 | 4 } })}
                  >
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                  </select>
                </label>
                <label className="block">
                  <span className="adm-label">Space between sections</span>
                  <select
                    className="adm-input"
                    value={theme.layout.sectionSpacing}
                    onChange={(event) => patch({ layout: { ...theme.layout, sectionSpacing: event.target.value as ThemeSettings["layout"]["sectionSpacing"] } })}
                  >
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="airy">Airy</option>
                  </select>
                </label>
                <Range
                  label="Corner rounding"
                  min={0}
                  max={28}
                  value={theme.layout.radius}
                  suffix="px"
                  onChange={(value) => patch({ layout: { ...theme.layout, radius: value } })}
                />
              </>
            )}
          </div>
        </aside>

        <div className="min-h-0 flex-1 overflow-hidden p-3 lg:p-5">
          <div
            className="mx-auto h-full overflow-hidden rounded-xl"
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
              src="/preview/home?theme=draft"
              title="Appearance preview"
              className="h-full w-full border-0"
              style={{ minHeight: 480 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `color-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm" htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded border"
          style={{ borderColor: "var(--adm-line)" }}
        />
        <input
          className="adm-input w-24 px-2 py-1 text-xs"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} hex code`}
        />
      </div>
    </div>
  );
}

function Range({
  label,
  min,
  max,
  step = 1,
  value,
  suffix,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const id = `range-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="adm-label" htmlFor={id}>{label}</label>
        <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
          {value}{suffix}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
      />
    </div>
  );
}
