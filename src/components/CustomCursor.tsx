"use client";

import { useEffect } from "react";
import { CRTRenderer } from "@/lib/crt-renderer";

export default function CustomCursor() {
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if ((window as any).__crtRenderer) {
        const renderer = (window as any).__crtRenderer as CRTRenderer;
        renderer.cursorX = e.clientX;
        renderer.cursorY = e.clientY;
        renderer.markDirty();
      }
    };

    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return null;
}
