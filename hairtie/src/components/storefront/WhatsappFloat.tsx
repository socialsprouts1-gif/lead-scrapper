"use client";

import { WhatsappIcon } from "@/components/ui/BrandIcons";
import { whatsappLink } from "@/lib/whatsapp";

export function WhatsappFloat({ number, storeName }: { number: string; storeName: string }) {
  const href = whatsappLink(number, `Hi ${storeName}, I'd like some help.`);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`Chat with ${storeName} on WhatsApp`}
      className="ht-whatsapp-float fixed bottom-20 right-4 z-40 grid h-12 w-12 place-items-center rounded-full shadow-lg transition hover:scale-105 md:bottom-6 md:right-6"
      style={{ background: "#25D366", color: "#fff" }}
    >
      <WhatsappIcon size={24} />
    </a>
  );
}
