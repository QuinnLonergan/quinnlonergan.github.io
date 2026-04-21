"use client";

import { useEffect, useRef } from "react";
import { CRTRenderer } from "@/lib/crt-renderer";
import { HeroSection } from "@/lib/crt-sections";
import { AboutSection } from "@/lib/crt-about-section";
import { ProjectsSection, type ProjectData } from "@/lib/crt-projects-section";
import { ContactSection } from "@/lib/crt-contact-section";

const projects: ProjectData[] = [
  {
    title: "Ballstreet",
    index: "01",
    category: "Fantasy Sports",
    description: "A fantasy sports game in which players buy and trade player stocks. Prices derive from real player performance, with the goal of predicting outcomes and out-earning players in your firm and across the app.",
    tech: ["React Native", "TypeScript", "Zustand", "FastAPI", "Python", "PostgreSQL"],
    images: Array.from({ length: 7 }, (_, i) => `/images/projects/ballstreet/${i + 1}.jpeg`),
  },
  {
    title: "WildLog",
    index: "02",
    category: "Social Media",
    description: "A nature-focused social platform where users share wildlife observations and experiences, from the local chipmunk to elephants on safari.",
    tech: ["React Native", "TypeScript", "Zustand", "PostgreSQL", "Firebase", "Docker", "Fastify"],
    images: Array.from({ length: 6 }, (_, i) => `/images/projects/wildlog/${i + 1}.jpeg`),
  },
  {
    title: "CryptidHunter",
    index: "03",
    category: "Action RPG",
    description: "A first-person action RPG in which a barbarian hunts and logs American cryptids across procedurally generated wilderness.",
    tech: ["Unity", "C#", "Blender"],
    images: Array.from({ length: 3 }, (_, i) => `/images/projects/cryptidhunter/${i + 1}.png`),
  },
  {
    title: "BasketballRPG",
    index: "04",
    category: "RPG Game",
    description: "A Pok\u00e9mon-style RPG following a low-poly CRT-style baller as he collects gear of legendary players and ascends GOAT Mountain.",
    tech: ["Unity", "C#", "Blender"],
    images: Array.from({ length: 2 }, (_, i) => `/images/projects/basketballrpg/${i + 1}.png`),
  },
];

export default function CRTFilter() {
  const rendererRef = useRef<CRTRenderer | null>(null);

  useEffect(() => {
    const renderer = new CRTRenderer();
    rendererRef.current = renderer;

    const hero = new HeroSection();
    const about = new AboutSection(hero.y + hero.height);
    const projectsSection = new ProjectsSection(projects, about.y + about.height);
    const pinRange = projectsSection.scrollWidth - window.innerWidth;
    const contactSection = new ContactSection(projectsSection.y + pinRange + projectsSection.height);

    renderer.sections = [hero, about, projectsSection, contactSection];

    renderer.mount(document.body);
    (window as any).__crtRenderer = renderer;

    const onScroll = () => {
      renderer.scrollY = window.scrollY;
      renderer.markDirty();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    const runHeroAnimation = async () => {
      await delay(200);

      const labelStart = performance.now();
      const animateLabels = (now: number) => {
        const t = Math.min(1, (now - labelStart) / 800);
        const ease = 1 - Math.pow(1 - t, 3);
        hero.labelOpacity = ease;
        renderer.markDirty();
        if (t < 1) requestAnimationFrame(animateLabels);
      };
      requestAnimationFrame(animateLabels);

      await delay(300);

      const l1Start = performance.now();
      const animateLine1 = (now: number) => {
        const t = Math.min(1, (now - l1Start) / 1100);
        const ease = 1 - Math.pow(1 - t, 3);
        hero.line1Opacity = ease;
        hero.line1Y = 60 * (1 - ease);
        renderer.markDirty();
        if (t < 1) requestAnimationFrame(animateLine1);
      };
      requestAnimationFrame(animateLine1);

      await delay(150);

      const l2Start = performance.now();
      const animateLine2 = (now: number) => {
        const t = Math.min(1, (now - l2Start) / 1100);
        const ease = 1 - Math.pow(1 - t, 3);
        hero.line2Opacity = ease;
        hero.line2Y = 60 * (1 - ease);
        renderer.markDirty();
        if (t < 1) requestAnimationFrame(animateLine2);
      };
      requestAnimationFrame(animateLine2);

      await delay(350);

      const qStart = performance.now();
      const animateQuote = (now: number) => {
        const t = Math.min(1, (now - qStart) / 1000);
        hero.quoteOpacity = 1 - Math.pow(1 - t, 3);
        renderer.markDirty();
        if (t < 1) requestAnimationFrame(animateQuote);
      };
      requestAnimationFrame(animateQuote);

      await delay(100);

      const rStart = performance.now();
      const animateReel = (now: number) => {
        const t = Math.min(1, (now - rStart) / 800);
        const ease = 1 - Math.pow(1 - t, 3);
        hero.reelOpacity = ease;
        hero.reelY = 30 * (1 - ease);
        renderer.markDirty();
        if (t < 1) requestAnimationFrame(animateReel);
      };
      requestAnimationFrame(animateReel);
    };

    renderer.onBootComplete = () => runHeroAnimation();

    return () => {
      window.removeEventListener("scroll", onScroll);
      (window as any).__crtRenderer = null;
      projectsSection.destroy();
      contactSection.destroy();
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  return null;
}
