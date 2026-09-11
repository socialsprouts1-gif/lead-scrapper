"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

/** A search box that keeps the query in the URL, debounced. */
export function SearchInput({ placeholder = "Search…" }: { placeholder?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set("q", value);
      else next.delete("q");
      next.delete("page");
      if (next.toString() !== params.toString()) router.replace(`?${next.toString()}`);
    }, 320);
    return () => clearTimeout(timeout);
    // `params` is intentionally excluded: including it restarts the debounce on
    // every URL change and the box would fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative flex-1 sm:max-w-xs">
      <Search
        size={15}
        strokeWidth={1.7}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: "var(--adm-muted)" }}
      />
      <label className="sr-only" htmlFor="admin-search">Search</label>
      <input
        id="admin-search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="adm-input pl-9"
        type="search"
      />
    </div>
  );
}

/** A <select> that writes its value into a URL parameter. */
export function FilterSelect({
  name,
  options,
  label,
  allLabel = "All",
}: {
  name: string;
  options: { value: string; label: string }[];
  label: string;
  allLabel?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <div>
      <label className="sr-only" htmlFor={`filter-${name}`}>{label}</label>
      <select
        id={`filter-${name}`}
        value={params.get(name) ?? ""}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          if (event.target.value) next.set(name, event.target.value);
          else next.delete(name);
          next.delete("page");
          router.replace(`?${next.toString()}`);
        }}
        className="adm-input w-auto"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

/**
 * A button that runs a server action, shows the result as a toast and refreshes
 * the page. `confirm` asks first — used for anything destructive.
 */
export function ActionButton({
  action,
  children,
  confirm,
  className = "adm-btn adm-btn-ghost adm-btn-sm",
  successMessage,
  onDone,
}: {
  action: () => Promise<{ ok: boolean; message?: string }>;
  children: React.ReactNode;
  confirm?: string;
  className?: string;
  successMessage?: string;
  onDone?: () => void;
}) {
  const { show } = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const result = await action();
          const message = result.message ?? (result.ok ? successMessage : "Something went wrong.");
          if (message) show(message, result.ok ? "default" : "error");
          if (result.ok) {
            router.refresh();
            onDone?.();
          }
        });
      }}
    >
      {pending ? <Spinner size={13} /> : null}
      {children}
    </button>
  );
}
