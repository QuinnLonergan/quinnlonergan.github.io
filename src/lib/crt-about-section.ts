import type { CRTSection } from "./crt-sections";

const COL = {
  base:      "#0d0b09",
  border:    "#2a2520",
  primary:   "#ede5d8",
  secondary: "#8a7f72",
  accent:    "#c8a97e",
};

const FONT_DISPLAY = "Archivo, sans-serif";
const FONT_MONO    = "'DM Mono', monospace";
const FONT_SERIF   = "'Instrument Serif', serif";

function clamp(min: number, pref: number, max: number) {
  return Math.max(min, Math.min(pref, max));
}
function vw(pct: number) { return window.innerWidth * pct / 100; }

const EXPERIENCE = [
  {
    company: "ReviewTrackers / PG Forsta",
    location: "Chicago, IL",
    roles: [
      {
        title: "Software Engineer III",
        dates: "Nov 2025 – Present",
        bullets: [
          "Own the full UI stack for the Report Builder initiative, from component architecture to production polish",
          "Collaborating with backend engineers on RESTful API design",
          "Independently introducing unit testing, linting, and formatting infrastructure",
        ],
      },
      {
        title: "Associate Frontend Engineer",
        dates: "Oct 2024 – Nov 2025",
        bullets: [
          "Built a custom text editor using Lexical with plugin architecture used across web and mobile",
          "Shipped AI Auto-Responding feature with multi-language support, cutting manual response time to zero",
        ],
      },
      {
        title: "Junior Frontend Engineer",
        dates: "Mar 2023 – Oct 2024",
        bullets: [
          "Launched AI review response tool that drove 45% adoption increase",
          "Redesigned scheduled exports UX — 522% growth in export creation",
          "Expanded test coverage with integration and unit tests to reduce regressions",
        ],
      },
      {
        title: "Support Engineer",
        dates: "Mar 2022 – Mar 2023",
        bullets: [
          "Translated customer pain points into engineering tickets, connecting support and product teams",
        ],
      },
    ],
  },
];

const EDUCATION = [
  { school: "Denison University", degree: "B.A. in Communications & Film" },
  { school: "Flatiron School", degree: "Full Stack Web Development, 2021" },
];

const SKILLS = {
  "Languages":   ["JavaScript", "TypeScript", "Ruby", "Go", "SQL"],
  "Frameworks":  ["React", "React Native", "Next.js", "Redux", "Rails", "Tailwind"],
  "Tools":       ["Jest", "RSpec", "Playwright", "Lexical", "Heroku", "Expo", "Storybook"],
};

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  maxWidth: number, lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let curY = y;

  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxWidth && line.length > 0) {
      ctx.fillText(line.trim(), x, curY);
      line = word + " ";
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, curY);
  return curY + lineHeight;
}

export class AboutSection implements CRTSection {
  y: number;
  height: number;
  animated = false;

  constructor(yStart: number) {
    this.y = yStart;
    this.height = window.innerHeight * 2.4;
  }

  draw(ctx: CanvasRenderingContext2D, scrollY: number, W: number, H: number, time: number) {
    const sectionTop = this.y - scrollY;
    if (sectionTop + this.height < 0 || sectionTop > H) return;

    const mobile = W < 480;
    const pad = mobile ? clamp(20, vw(5), 40) : clamp(60, vw(6), 100);
    const contentW = Math.min(W - pad * 2, 900);
    const leftX = (W - contentW) / 2;

    ctx.fillStyle = COL.base;
    ctx.fillRect(0, Math.max(0, sectionTop), W, Math.min(this.height, H));

    let curY = sectionTop + clamp(80, H * 0.12, 140);

    ctx.strokeStyle = COL.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftX, curY);
    ctx.lineTo(leftX + contentW, curY);
    ctx.stroke();
    curY += 50;

    ctx.font = `400 ${13}px ${FONT_MONO}`;
    ctx.letterSpacing = "4px";
    ctx.fillStyle = COL.secondary;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("ABOUT", leftX, curY);
    curY += 50;

    ctx.font = `italic 400 ${clamp(20, vw(2.5), 28)}px ${FONT_SERIF}`;
    ctx.letterSpacing = "0px";
    ctx.fillStyle = COL.primary;
    const profileText = "Full Stack Engineer with a proven track record scaling from Support to Software Engineer III, shipping high-impact features with JavaScript, TypeScript, React, Ruby, and Rails.";
    curY = wrapText(ctx, profileText, leftX, curY, contentW, clamp(28, vw(3.5), 38));
    curY += 15;

    ctx.fillStyle = COL.accent;
    ctx.font = `italic 400 ${clamp(18, vw(2), 24)}px ${FONT_SERIF}`;
    const profileText2 = "My background in the arts shaped how I view engineering: it's an artistic practice that demands both technical rigor and thoughtful craftsmanship.";
    curY = wrapText(ctx, profileText2, leftX, curY, contentW, clamp(26, vw(3), 34));
    curY += 60;

    ctx.strokeStyle = COL.border;
    ctx.beginPath();
    ctx.moveTo(leftX, curY);
    ctx.lineTo(leftX + contentW, curY);
    ctx.stroke();
    curY += 40;

    ctx.font = `400 ${13}px ${FONT_MONO}`;
    ctx.letterSpacing = "4px";
    ctx.fillStyle = COL.secondary;
    ctx.fillText("EXPERIENCE", leftX, curY);

    curY += 55;

    for (const exp of EXPERIENCE) {
      ctx.font = `700 ${clamp(16, vw(2), 22)}px ${FONT_DISPLAY}`;
      ctx.fillStyle = COL.primary;
      ctx.fillText(exp.company, leftX, curY);
      curY += 22;

      ctx.font = `400 ${11}px ${FONT_MONO}`;
      ctx.letterSpacing = "2px";
      ctx.fillStyle = COL.secondary;
      ctx.fillText(exp.location.toUpperCase(), leftX, curY);
      ctx.letterSpacing = "0px";
      curY += 35;

      for (const role of exp.roles) {
        ctx.font = `600 ${clamp(14, vw(1.6), 18)}px ${FONT_DISPLAY}`;
        ctx.fillStyle = COL.accent;
        ctx.fillText(role.title, leftX + 16, curY);

        if (mobile) {
          curY += 20;
          ctx.font = `400 ${10}px ${FONT_MONO}`;
          ctx.letterSpacing = "1px";
          ctx.fillStyle = COL.secondary;
          ctx.fillText(role.dates.toUpperCase(), leftX + 16, curY);
          ctx.letterSpacing = "0px";
          curY += 20;
        } else {
          ctx.font = `400 ${11}px ${FONT_MONO}`;
          ctx.letterSpacing = "1px";
          ctx.fillStyle = COL.secondary;
          ctx.textAlign = "right";
          ctx.fillText(role.dates.toUpperCase(), leftX + contentW, curY + 2);
          ctx.textAlign = "left";
          ctx.letterSpacing = "0px";
          curY += 28;
        }

        ctx.font = `400 ${clamp(12, vw(1.3), 15)}px ${FONT_MONO}`;
        ctx.fillStyle = COL.secondary;
        for (const bullet of role.bullets) {
          ctx.fillText("→", leftX + 20, curY);
          curY = wrapText(ctx, bullet, leftX + 40, curY, contentW - 44, clamp(18, vw(2), 22));
          curY += 6;
        }
        curY += 18;

        ctx.strokeStyle = COL.border;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(leftX + 16, curY);
        ctx.lineTo(leftX + contentW * 0.4, curY);
        ctx.stroke();
        ctx.globalAlpha = 1;
        curY += 24;
      }
    }

    curY += 30;

    ctx.strokeStyle = COL.border;
    ctx.beginPath();
    ctx.moveTo(leftX, curY);
    ctx.lineTo(leftX + contentW, curY);
    ctx.stroke();
    curY += 40;

    ctx.font = `400 ${13}px ${FONT_MONO}`;
    ctx.letterSpacing = "4px";
    ctx.fillStyle = COL.secondary;
    ctx.fillText("EDUCATION", leftX, curY);
    curY += 45;

    for (const edu of EDUCATION) {
      ctx.font = `700 ${clamp(14, vw(1.6), 18)}px ${FONT_DISPLAY}`;
      ctx.fillStyle = COL.primary;
      ctx.fillText(edu.school, leftX, curY);
      curY += 24;

      ctx.font = `italic 400 ${clamp(13, vw(1.4), 16)}px ${FONT_SERIF}`;
      ctx.fillStyle = COL.accent;
      ctx.fillText(edu.degree, leftX, curY);
      curY += 40;
    }

    curY += 20;

    ctx.strokeStyle = COL.border;
    ctx.beginPath();
    ctx.moveTo(leftX, curY);
    ctx.lineTo(leftX + contentW, curY);
    ctx.stroke();
    curY += 40;

    ctx.font = `400 ${13}px ${FONT_MONO}`;
    ctx.letterSpacing = "4px";
    ctx.fillStyle = COL.secondary;
    ctx.fillText("SKILLS", leftX, curY);
    curY += 50;

    const skillCategories = Object.entries(SKILLS);

    if (mobile) {
      const colCount = 2;
      const colW = contentW / colCount;
      let sColY = curY;

      for (let i = 0; i < skillCategories.length; i++) {
        const [category, items] = skillCategories[i];
        const col = i % colCount;
        const colX = leftX + col * colW;
        if (col === 0 && i > 0) sColY += 12;
        let skillY = sColY;

        ctx.font = `400 ${10}px ${FONT_MONO}`;
        ctx.letterSpacing = "2px";
        ctx.fillStyle = COL.accent;
        ctx.fillText(category.toUpperCase(), colX, skillY);
        ctx.letterSpacing = "0px";
        skillY += 22;

        for (const skill of items) {
          const dotPhase = time * 2 + i * 1.5 + skillY * 0.01;
          const dotAlpha = Math.sin(dotPhase) * 0.3 + 0.5;
          ctx.globalAlpha = dotAlpha;
          ctx.fillStyle = COL.accent;
          ctx.fillRect(colX, skillY + 3, 3, 3);
          ctx.globalAlpha = 1;

          ctx.font = `400 ${11}px ${FONT_MONO}`;
          ctx.fillStyle = COL.primary;
          ctx.fillText(skill, colX + 12, skillY);
          skillY += 20;
        }

        if (col === 1 || i === skillCategories.length - 1) {
          sColY = skillY + 8;
        }
      }
    } else {
      const colWidth = contentW / skillCategories.length;

      for (let i = 0; i < skillCategories.length; i++) {
        const [category, items] = skillCategories[i];
        const colX = leftX + i * colWidth;

        ctx.font = `400 ${11}px ${FONT_MONO}`;
        ctx.letterSpacing = "2px";
        ctx.fillStyle = COL.accent;
        ctx.fillText(category.toUpperCase(), colX, curY);
        ctx.letterSpacing = "0px";

        let skillY = curY + 28;
        for (const skill of items) {
          const dotPhase = time * 2 + i * 1.5 + skillY * 0.01;
          const dotAlpha = Math.sin(dotPhase) * 0.3 + 0.5;
          ctx.globalAlpha = dotAlpha;
          ctx.fillStyle = COL.accent;
          ctx.fillRect(colX, skillY + 4, 4, 4);
          ctx.globalAlpha = 1;

          ctx.font = `400 ${clamp(12, vw(1.2), 14)}px ${FONT_MONO}`;
          ctx.fillStyle = COL.primary;
          ctx.fillText(skill, colX + 14, skillY);
          skillY += 24;
        }
      }
    }

    ctx.letterSpacing = "0px";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
}
