"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import ProjectsScroll from "@/components/ProjectsScroll";
import ContactSection from "@/components/ContactSection";
import CRTModel from "@/components/CRTModel";

export default function Home() {
  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });

      gsap.set(
        [
          ".hero__label",
          ".hero__headline-line",
          ".hero__quote",
          ".hero__vertical",
        ],
        { opacity: 0 }
      );

      gsap.set(".scanlines", { opacity: 0 });
      tl.to(".scanlines", {
        opacity: 1,
        duration: 0.1,
        repeat: 2,
        yoyo: true,
        ease: "power1.inOut",
      });

      tl.to(
        ".hero__label",
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "cinematic",
          stagger: 0.05,
        },
        0.4
      );
      gsap.set(".hero__label", { y: 8 });

      tl.to(
        ".hero__headline-line:first-child",
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "cinematic",
        },
        0.7
      );
      gsap.set(".hero__headline-line", { y: 60 });

      tl.to(
        ".hero__headline-line:last-child",
        {
          opacity: 1,
          y: 0,
          duration: 1.1,
          ease: "cinematic",
        },
        0.85
      );

      tl.to(
        ".hero__quote",
        {
          opacity: 1,
          duration: 1.0,
          ease: "cinematic",
        },
        1.2
      );

      gsap.set(".hero__vertical", { y: 30 });
      tl.to(
        ".hero__vertical",
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "cinematic",
        },
        1.3
      );
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
    <section className="hero" ref={heroRef}>
      <span className="hero__label hero__label--left">
        Portfolio — 2025
      </span>

      <span className="hero__label hero__label--right">
        Scroll to explore ↓
      </span>

      <h1 className="hero__headline">
        <span className="hero__headline-line">Quinn</span>
        <span className="hero__headline-line">Lonergan</span>
      </h1>

      <blockquote className="hero__quote">
        Frontend focused, tech neophile, film lover. code as craft.
      </blockquote>

      <span className="hero__vertical">
        Reel
      </span>
    </section>
    <div style={{ height: "240vh" }} aria-hidden="true" />
    <ProjectsScroll />
    <ContactSection />
    <CRTModel />
    </>
  );
}
