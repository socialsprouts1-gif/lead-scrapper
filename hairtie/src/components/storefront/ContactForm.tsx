"use client";

import { useState } from "react";
import { whatsappLink } from "@/lib/whatsapp";
import { WhatsappIcon } from "@/components/ui/BrandIcons";

/**
 * The contact form composes a WhatsApp message rather than posting to an email
 * service, so it works from day one without any third-party account. If email
 * delivery is added later, this is the one component to change.
 */
export function ContactForm({ whatsapp, email }: { whatsapp: string; email: string }) {
  const [sent, setSent] = useState(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = [
      `Hi Hairtie, I'm ${form.get("name")}.`,
      form.get("orderNumber") ? `Order number: ${form.get("orderNumber")}` : "",
      "",
      String(form.get("message") ?? ""),
      "",
      `You can reach me on ${form.get("contact")}.`,
    ]
      .filter((line) => line !== null)
      .join("\n");

    const href = whatsappLink(whatsapp, message);
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
      setSent(true);
    } else {
      window.location.href = `mailto:${email}?subject=${encodeURIComponent("Hairtie enquiry")}&body=${encodeURIComponent(message)}`;
    }
  }

  if (sent) {
    return (
      <div className="ht-card p-8 text-center">
        <p className="font-serif text-2xl">Off it goes</p>
        <p className="mt-2 text-sm" style={{ color: "var(--ht-muted)" }}>
          We&apos;ve opened WhatsApp with your message. Send it and we&apos;ll reply as soon as we can.
        </p>
        <button type="button" onClick={() => setSent(false)} className="ht-btn ht-btn-outline mt-5">
          Write another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="ht-card space-y-4 p-6 md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="ht-label" htmlFor="contact-name">Your name</label>
          <input id="contact-name" name="name" required className="ht-input" />
        </div>
        <div>
          <label className="ht-label" htmlFor="contact-reach">Phone or email</label>
          <input id="contact-reach" name="contact" required className="ht-input" />
        </div>
      </div>
      <div>
        <label className="ht-label" htmlFor="contact-order">Order number (if you have one)</label>
        <input id="contact-order" name="orderNumber" className="ht-input uppercase" />
      </div>
      <div>
        <label className="ht-label" htmlFor="contact-message">How can we help?</label>
        <textarea id="contact-message" name="message" required rows={5} className="ht-input" />
      </div>
      <button type="submit" className="ht-btn w-full" style={{ background: "#25D366", color: "#fff" }}>
        <WhatsappIcon size={17} /> Send on WhatsApp
      </button>
      <p className="text-center text-xs" style={{ color: "var(--ht-muted)" }}>
        Prefer email? Write to{" "}
        <a href={`mailto:${email}`} className="ht-underline">{email}</a>
      </p>
    </form>
  );
}
