"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function NewsletterForm({ buttonLabel = "Subscribe" }: { buttonLabel?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!email) return;
    setState("loading");
    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
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
      <p className="text-sm" style={{ color: "var(--ht-primary)" }}>
        {message || "Thank you — you're on the list."}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">
        Email address
      </label>
      <input
        id="newsletter-email"
        name="email"
        type="email"
        required
        placeholder="your@email.com"
        className="ht-input flex-1"
      />
      <button type="submit" className="ht-btn ht-btn-primary" disabled={state === "loading"}>
        {state === "loading" ? <Spinner size={14} /> : buttonLabel}
      </button>
      {state === "error" && message && (
        <p className="text-sm" style={{ color: "#a33" }}>
          {message}
        </p>
      )}
    </form>
  );
}
