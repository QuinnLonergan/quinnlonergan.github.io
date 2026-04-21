"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "@/lib/gsap";

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const pausedRef = useRef(false);
  const startedRef = useRef(false);

  const formatTime = useCallback((totalSeconds: number) => {
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const ctx = gsap.context(() => {
      gsap.set(header, { opacity: 0 });

      const tl = gsap.timeline({ delay: 0.3 });

      // CRT flicker entrance — rapid opacity toggles
      tl.to(header, { opacity: 1, duration: 0.04, ease: "none" })
        .to(header, { opacity: 0, duration: 0.04, ease: "none" })
        .to(header, { opacity: 1, duration: 0.04, ease: "none" })
        .to(header, { opacity: 0, duration: 0.04, ease: "none" })
        .to(header, { opacity: 1, duration: 0.04, ease: "none" })
        .to(header, { opacity: 0.4, duration: 0.03, ease: "none" })
        .to(header, { opacity: 1, duration: 0.04, ease: "none", onComplete: () => {
          startedRef.current = true;
        }});
    }, header);

    return () => ctx.revert();
  }, []);

  // Timecode counter — starts after flicker completes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!startedRef.current) return;
      if (!pausedRef.current) {
        setElapsed((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header" ref={headerRef}>
      <div className="header__left">
        <span className="header__name">Quinn Lonergan</span>
        <span className="header__role">Creative Engineer</span>
      </div>

      <div className="header__center">
        <div className="header__filmstrip-rule" />
        <div className="header__sprockets">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={i} className="header__sprocket" />
          ))}
        </div>
        <div className="header__filmstrip-rule" />
      </div>

      <div
        className="header__right"
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
        data-cursor="hover"
      >
        <span className="header__timecode">{formatTime(elapsed)}</span>
      </div>
    </header>
  );
}
