"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCustomerNote } from "@/app/actions/admin/misc";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export function CustomerNote({ userId, note }: { userId: string; note: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [value, setValue] = useState(note);
  const [pending, start] = useTransition();

  return (
    <form
      className="adm-card space-y-3 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await saveCustomerNote(userId, value);
          show(result.message ?? "", result.ok ? "default" : "error");
          router.refresh();
        });
      }}
    >
      <h2 className="text-base">Private note</h2>
      <textarea
        rows={4}
        className="adm-input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Anything you want to remember about this customer."
      />
      <button type="submit" className="adm-btn adm-btn-ghost w-full" disabled={pending}>
        {pending ? <Spinner size={13} /> : null} Save note
      </button>
    </form>
  );
}
