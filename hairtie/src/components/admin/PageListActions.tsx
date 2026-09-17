"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createPage } from "@/app/actions/admin/editor";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export function PageListActions() {
  const router = useRouter();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setOpen(true)}>
        <Plus size={15} strokeWidth={1.8} /> New page
      </button>
    );
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await createPage(title);
          show(result.message ?? "", result.ok ? "default" : "error");
          if (result.ok && result.data && typeof result.data === "object" && "slug" in result.data) {
            router.push(`/admin/editor/${(result.data as { slug: string }).slug}`);
          }
        });
      }}
    >
      <label className="sr-only" htmlFor="new-page-title">Page name</label>
      <input
        id="new-page-title"
        className="adm-input"
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Page name, e.g. Gifting"
      />
      <button type="submit" className="adm-btn adm-btn-primary" disabled={pending || title.trim().length < 2}>
        {pending ? <Spinner size={13} /> : null} Create
      </button>
      <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}
