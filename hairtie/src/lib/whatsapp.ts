/** Builds a wa.me link with a pre-filled message. */
export function whatsappLink(number: string, message: string) {
  const digits = (number || "").replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function productInquiryMessage(productName: string, url?: string) {
  const base = `Hi Hairtie, I'm interested in ${productName}.`;
  return url ? `${base}\n${url}` : base;
}
