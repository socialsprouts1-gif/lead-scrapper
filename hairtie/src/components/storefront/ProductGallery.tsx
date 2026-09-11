"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ZoomIn } from "lucide-react";

type GalleryImage = { url: string; alt: string };

export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const scrollerRef = useRef<HTMLDivElement>(null);

  if (images.length === 0) {
    return (
      <div
        className="grid place-items-center"
        style={{ aspectRatio: "4 / 5", borderRadius: "var(--ht-radius)", background: "var(--ht-surface)" }}
      >
        <p className="text-sm" style={{ color: "var(--ht-muted)" }}>
          No photos yet
        </p>
      </div>
    );
  }

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <div className="min-w-0 md:flex md:gap-4">
      {/* Desktop thumbnails */}
      <div className="hidden md:flex md:w-20 md:shrink-0 md:flex-col md:gap-3">
        {images.map((image, index) => (
          <button
            key={image.url + index}
            type="button"
            onClick={() => setActive(index)}
            aria-label={`Show image ${index + 1} of ${images.length}`}
            aria-current={index === active}
            className="relative overflow-hidden transition"
            style={{
              aspectRatio: "4 / 5",
              borderRadius: "calc(var(--ht-radius) * 0.5)",
              outline: index === active ? "1.5px solid var(--ht-text)" : "1px solid var(--ht-border)",
              outlineOffset: "1px",
            }}
          >
            <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>

      {/* Desktop main image with hover zoom */}
      <div
        className="relative hidden flex-1 overflow-hidden md:block"
        style={{ aspectRatio: "4 / 5", borderRadius: "var(--ht-radius)", background: "var(--ht-surface)" }}
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={onMove}
      >
        <Image
          src={images[active].url}
          alt={images[active].alt || name}
          fill
          priority
          sizes="(max-width: 1024px) 60vw, 45vw"
          className="object-cover transition-transform duration-200"
          style={{ transform: zooming ? "scale(1.9)" : "scale(1)", transformOrigin: origin }}
        />
        {!zooming && (
          <span
            className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] uppercase tracking-widest"
            style={{ background: "rgba(255,255,255,0.9)" }}
          >
            <ZoomIn size={13} strokeWidth={1.6} /> Hover to zoom
          </span>
        )}
      </div>

      {/* Mobile: swipeable */}
      <div className="min-w-0 overflow-hidden md:hidden">
        <div ref={scrollerRef} onScroll={onScroll} className="ht-scroll-x -mx-5">
          {images.map((image, index) => (
            <div
              key={image.url + index}
              className="relative w-screen"
              style={{ aspectRatio: "4 / 5", background: "var(--ht-surface)" }}
            >
              <Image
                src={image.url}
                alt={image.alt || name}
                fill
                priority={index === 0}
                sizes="100vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {images.map((image, index) => (
            <span
              key={image.url + index}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: index === active ? "18px" : "6px",
                background: index === active ? "var(--ht-text)" : "var(--ht-border)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
