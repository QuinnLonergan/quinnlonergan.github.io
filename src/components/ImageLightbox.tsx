"use client";

import { useEffect, useState } from "react";

export default function ImageLightbox() {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.src) setSrc(detail.src);
    };
    window.addEventListener("crt:lightbox", handler);
    return () => window.removeEventListener("crt:lightbox", handler);
  }, []);

  if (!src) return null;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setSrc(null); }}
      onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setSrc(null); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(10, 8, 6, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        padding: 16,
      }}
    >
      <img
        src={src}
        alt=""
        style={{
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          borderRadius: 4,
          boxShadow: "0 0 40px rgba(200, 169, 126, 0.15)",
        }}
      />
      <span
        style={{
          position: "absolute",
          top: 16,
          right: 20,
          color: "#8a7f72",
          fontSize: 14,
          fontFamily: "var(--font-mono)",
          letterSpacing: "2px",
        }}
      >
        TAP TO CLOSE
      </span>
    </div>
  );
}
