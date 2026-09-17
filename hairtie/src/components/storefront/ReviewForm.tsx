"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";

export function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("loading");
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating,
          authorName: form.get("authorName"),
          authorEmail: form.get("authorEmail"),
          title: form.get("title"),
          body: form.get("body"),
        }),
      });
      const data = await response.json();
      setMessage(data.message ?? "");
      setState(response.ok ? "done" : "error");
    } catch {
      setMessage("Something went wrong. Please try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="ht-card p-6 text-center">
        <p className="font-serif text-xl">Thank you</p>
        <p className="mt-2 text-sm" style={{ color: "var(--ht-muted)" }}>
          {message || "Your review has been sent and will appear once we've read it."}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="ht-btn ht-btn-outline">
        Write a review
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="ht-card space-y-4 p-6">
      <div>
        <span className="ht-label">Your rating</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} star${value > 1 ? "s" : ""}`}
              aria-pressed={rating === value}
            >
              <Star
                size={24}
                strokeWidth={1.4}
                className={value <= rating ? "fill-current" : ""}
                style={{ color: value <= rating ? "var(--ht-primary)" : "var(--ht-border)" }}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="ht-label" htmlFor="review-name">Your name</label>
          <input id="review-name" name="authorName" required maxLength={60} className="ht-input" />
        </div>
        <div>
          <label className="ht-label" htmlFor="review-email">Email (not published)</label>
          <input id="review-email" name="authorEmail" type="email" className="ht-input" />
        </div>
      </div>
      <div>
        <label className="ht-label" htmlFor="review-title">Headline</label>
        <input id="review-title" name="title" maxLength={80} className="ht-input" placeholder="Sums up your experience" />
      </div>
      <div>
        <label className="ht-label" htmlFor="review-body">Your review</label>
        <textarea id="review-body" name="body" required rows={4} maxLength={1200} className="ht-input" />
      </div>
      {state === "error" && message && (
        <p className="text-sm" style={{ color: "#a33" }}>{message}</p>
      )}
      <div className="flex gap-3">
        <button type="submit" className="ht-btn ht-btn-primary" disabled={state === "loading"}>
          {state === "loading" ? <Spinner size={14} /> : null}
          Submit review
        </button>
        <button type="button" className="ht-btn ht-btn-outline" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <p className="text-xs" style={{ color: "var(--ht-muted)" }}>
        Reviews are read before they appear on the site.
      </p>
    </form>
  );
}
