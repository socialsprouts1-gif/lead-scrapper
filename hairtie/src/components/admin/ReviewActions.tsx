"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteReview, setReviewStatus } from "@/app/actions/admin/misc";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export function ReviewActions({
  reviewId,
  status,
}: {
  reviewId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}) {
  const router = useRouter();
  const { show } = useToast();
  const [pending, start] = useTransition();

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const result = await action();
      if (result.message) show(result.message, result.ok ? "default" : "error");
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {pending && <Spinner size={13} />}
      {status !== "APPROVED" && (
        <button
          type="button"
          className="adm-btn adm-btn-primary adm-btn-sm"
          disabled={pending}
          onClick={() => run(() => setReviewStatus(reviewId, "APPROVED"))}
        >
          Publish
        </button>
      )}
      {status !== "REJECTED" && (
        <button
          type="button"
          className="adm-btn adm-btn-ghost adm-btn-sm"
          disabled={pending}
          onClick={() => run(() => setReviewStatus(reviewId, "REJECTED"))}
        >
          Hide
        </button>
      )}
      <button
        type="button"
        className="adm-btn adm-btn-danger adm-btn-sm"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Delete this review permanently?")) return;
          run(() => deleteReview(reviewId));
        }}
      >
        Delete
      </button>
    </div>
  );
}
