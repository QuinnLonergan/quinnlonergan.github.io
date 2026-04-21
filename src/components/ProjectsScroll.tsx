"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const projects = [
  {
    title: "Ballstreet", index: "01", category: "Fantasy Sports",
    description: "A fantasy sports game in which players buy and trade player stocks. Prices derive from real player performance.",
    tech: "React Native · TypeScript · Zustand · FastAPI · Python · PostgreSQL",
  },
  {
    title: "WildLog", index: "02", category: "Social Media",
    description: "A nature-focused social platform where users share wildlife observations and experiences.",
    tech: "React Native · TypeScript · Zustand · PostgreSQL · Firebase · Docker · Fastify",
  },
  {
    title: "CryptidHunter", index: "03", category: "Action RPG",
    description: "A first-person action RPG in which a barbarian hunts and logs American cryptids.",
    tech: "Unity · C# · Blender",
  },
  {
    title: "BasketballRPG", index: "04", category: "RPG Game",
    description: "A Pokémon-style RPG following a low-poly CRT-style baller as he collects gear of legendary players.",
    tech: "Unity · C# · Blender",
  },
];

export default function ProjectsScroll() {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const container = containerRef.current;
    if (!section || !container) return;

    const ctx = gsap.context(() => {
      gsap.to(container, {
        x: () => -(container.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => "+=" + (container.scrollWidth - window.innerWidth),
          scrub: 1.8,
          pin: true,
          pinType: "transform",
          invalidateOnRefresh: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section className="projects" ref={sectionRef}>
      <div className="projects__container" ref={containerRef} style={{ display: "flex" }}>
        {projects.map((project) => (
          <article
            key={project.index}
            style={{ width: "100vw", minWidth: "100vw", height: "100vh" }}
            data-cursor="hover"
          >
            <span>{project.index}</span>
            <h3>{project.title}</h3>
            <span>{project.category}</span>
            <p>{project.description}</p>
            <span>{project.tech}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
