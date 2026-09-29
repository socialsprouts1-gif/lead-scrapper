"use client";

import { useEffect, useState } from "react";

/**
 * Counts down to a moment set in the editor. The clock only starts once the
 * component is on the client, so the server and the first client render agree.
 */
export function Countdown({ endsAt, expiredText }: { endsAt: string; expiredText: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = new Date(endsAt).getTime();
    if (!Number.isFinite(target)) return;

    const tick = () => setRemaining(Math.max(target - Date.now(), 0));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (remaining === null) {
    // Before the first tick, hold the row's height so nothing jumps.
    return <div className="mt-6 h-[4.5rem]" aria-hidden />;
  }

  if (remaining <= 0) {
    return (
      <p className="mt-6 text-sm" style={{ color: "var(--ht-muted)" }}>
        {expiredText}
      </p>
    );
  }

  const seconds = Math.floor(remaining / 1000);
  const parts = [
    { value: Math.floor(seconds / 86400), label: "days" },
    { value: Math.floor((seconds % 86400) / 3600), label: "hours" },
    { value: Math.floor((seconds % 3600) / 60), label: "mins" },
    { value: seconds % 60, label: "secs" },
  ];

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-3" aria-live="off">
      {parts.map((part) => (
        <div
          key={part.label}
          className="min-w-[4.5rem] rounded-xl px-4 py-3 text-center"
          style={{ background: "rgba(255,255,255,0.72)" }}
        >
          <div className="font-serif text-2xl leading-none">{String(part.value).padStart(2, "0")}</div>
          <div className="mt-1 text-[0.66rem] uppercase tracking-wider" style={{ color: "var(--ht-muted)" }}>
            {part.label}
          </div>
        </div>
      ))}
    </div>
  );
}
