/** Brand marks, drawn inline — lucide no longer ships logo icons. */

type Props = { size?: number; className?: string };

export function InstagramIcon({ size = 16, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ size = 16, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M15.5 3.5h-2.2A3.8 3.8 0 0 0 9.5 7.3V10H7v3h2.5v8h3.2v-8h2.6l.7-3h-3.3V7.6c0-.6.4-1.1 1-1.1h2.3z" />
    </svg>
  );
}

export function YoutubeIcon({ size = 16, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2" y="5.5" width="20" height="13" rx="4" />
      <path d="M10.2 9.4v5.2l4.6-2.6z" />
    </svg>
  );
}

export function PinterestIcon({ size = 16, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M10 21c-.5-1.6-.2-3 .1-4.3l1-4.2M8.9 9.6c0-1.9 1.5-3.4 3.6-3.4 2 0 3.4 1.3 3.4 3.2 0 2.4-1.3 4.3-3.2 4.3-1 0-1.7-.8-1.5-1.8" />
    </svg>
  );
}

export function WhatsappIcon({ size = 16, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3.2 20.8l1.3-4.2A8.5 8.5 0 1 1 7.7 19.6z" />
      <path d="M9 8.6c.3-.1.6 0 .8.3l.7 1.2c.1.3.1.6-.1.8l-.5.5c-.1.2-.2.4 0 .6.5.9 1.2 1.6 2.1 2.1.2.1.4.1.6-.1l.5-.5c.2-.2.5-.2.8-.1l1.2.7c.3.2.4.5.3.8-.2.7-.9 1.2-1.7 1.2-2.7-.2-5-2.5-5.2-5.2 0-.8.5-1.5 1.2-1.7z" />
    </svg>
  );
}
