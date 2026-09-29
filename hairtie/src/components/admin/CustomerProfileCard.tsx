"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { updateCustomerProfile } from "@/app/actions/admin/customers";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

const SUGGESTED = ["VIP", "Wholesale", "Repeat buyer", "Needs follow-up", "Gift customer"];

/**
 * The shop owner's own record of a customer — a note, some tags, and whether
 * they are allowed to order. Everything else on the page comes from orders.
 */
export function CustomerProfileCard({
  email,
  initial,
}: {
  email: string;
  initial: { note: string; tags: string[]; isBlocked: boolean };
}) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, start] = useTransition();

  const [note, setNote] = useState(initial.note);
  const [tags, setTags] = useState(initial.tags);
  const [isBlocked, setIsBlocked] = useState(initial.isBlocked);
  const [draftTag, setDraftTag] = useState("");

  function save(next?: { isBlocked?: boolean }) {
    const blocked = next?.isBlocked ?? isBlocked;
    start(async () => {
      const result = await updateCustomerProfile({ email, note, tags, isBlocked: blocked });
      show(result.message ?? "", result.ok ? "default" : "error");
      if (result.ok) router.refresh();
    });
  }

  function addTag(value: string) {
    const clean = value.trim();
    if (!clean) return;
    if (tags.some((tag) => tag.toLowerCase() === clean.toLowerCase())) return;
    setTags([...tags, clean]);
    setDraftTag("");
  }

  return (
    <div className="adm-card p-5">
      <h2 className="mb-1 text-base">Your notes</h2>
      <p className="adm-hint mb-4">Only you see this. Customers never do.</p>

      <span className="adm-label">Tags</span>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs"
            style={{ background: "var(--adm-bg)" }}
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => setTags(tags.filter((entry) => entry !== tag))}
            >
              <X size={11} strokeWidth={2.4} />
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span className="text-xs" style={{ color: "var(--adm-muted)" }}>
            No tags yet.
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          className="adm-input"
          placeholder="Add a tag"
          aria-label="Add a tag"
          value={draftTag}
          onChange={(event) => setDraftTag(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag(draftTag);
            }
          }}
        />
        <button
          type="button"
          className="adm-btn adm-btn-ghost adm-btn-sm shrink-0"
          onClick={() => addTag(draftTag)}
        >
          <Plus size={13} strokeWidth={2} /> Add
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {SUGGESTED.filter((tag) => !tags.some((entry) => entry.toLowerCase() === tag.toLowerCase())).map(
          (tag) => (
            <button
              key={tag}
              type="button"
              className="rounded-full px-2.5 py-1 text-[0.68rem]"
              style={{ background: "var(--adm-bg)", color: "var(--adm-muted)" }}
              onClick={() => addTag(tag)}
            >
              + {tag}
            </button>
          ),
        )}
      </div>

      <label className="adm-label mt-5 block" htmlFor="customer-note">Note</label>
      <textarea
        id="customer-note"
        rows={4}
        className="adm-input"
        placeholder="Prefers pastel shades. Always asks for gift wrap."
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" className="adm-btn adm-btn-primary adm-btn-sm" disabled={pending} onClick={() => save()}>
          {pending ? <Spinner size={12} /> : null} Save notes
        </button>

        <button
          type="button"
          className="adm-btn adm-btn-ghost adm-btn-sm"
          disabled={pending}
          style={isBlocked ? undefined : { color: "#9c3a3a" }}
          onClick={() => {
            const next = !isBlocked;
            if (
              next &&
              !window.confirm("Block this customer? They will not be able to place another order.")
            ) {
              return;
            }
            setIsBlocked(next);
            save({ isBlocked: next });
          }}
        >
          {isBlocked ? "Unblock this customer" : "Block from ordering"}
        </button>
      </div>

      {isBlocked && (
        <p className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "#f7e7e4" }}>
          Blocked. Checkout refuses any new order from this email address.
        </p>
      )}
    </div>
  );
}
