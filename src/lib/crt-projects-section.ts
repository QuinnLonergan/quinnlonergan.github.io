import type { CRTSection } from "./crt-sections";
import { COL, FONT_DISPLAY, FONT_MONO, FONT_SERIF } from "./crt-sections";

function clamp(min: number, pref: number, max: number) {
  return Math.max(min, Math.min(pref, max));
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = words[0] || "";
  for (let i = 1; i < words.length; i++) {
    const test = line + " " + words[i];
    if (ctx.measureText(test).width <= maxW) {
      line = test;
    } else {
      lines.push(line);
      line = words[i];
    }
  }
  if (line) lines.push(line);
  return lines;
}

export interface ProjectData {
  title: string;
  index: string;
  category: string;
  description: string;
  tech: string[];
  images: string[];
}

const CYCLE_SEC = 7;
const GLITCH_SEC = 0.12;

export class ProjectsSection implements CRTSection {
  y: number;
  height: number;
  scrollWidth: number;
  projects: ProjectData[];
  animated = true;

  private imgs = new Map<string, HTMLImageElement>();
  private imageIndices: number[];
  private lastChange: number[];
  private chevronHits: { lx: number; ly: number; rx: number; ry: number; s: number; pi: number } | null = null;
  private _onClick: ((e: MouseEvent) => void) | null = null;
  private _onMouseMove: ((e: MouseEvent) => void) | null = null;
  private hoveredChevron: "left" | "right" | null = null;
  imageHit: { x: number; y: number; w: number; h: number; src: string } | null = null;

  constructor(projects: ProjectData[], yStart: number) {
    this.projects = projects;
    this.y = yStart;
    this.height = window.innerHeight;

    // Each project card = one full viewport width
    this.scrollWidth = projects.length * window.innerWidth;

    this.imageIndices = projects.map(() => 0);
    this.lastChange = projects.map(() => performance.now() / 1000);

    for (const p of projects) {
      for (const src of p.images) {
        const img = new Image();
        img.src = src;
        img.onload = () => this.imgs.set(src, img);
      }
    }

    this._onClick = (e: MouseEvent) => {
      const mx = e.clientX, my = e.clientY;

      // Mobile: tap image to open lightbox
      const ih = this.imageHit;
      if (ih && window.innerWidth < 480) {
        if (mx >= ih.x && mx <= ih.x + ih.w && my >= ih.y && my <= ih.y + ih.h) {
          window.dispatchEvent(new CustomEvent("crt:lightbox", { detail: { src: ih.src } }));
          return;
        }
      }

      const h = this.chevronHits;
      if (!h) return;
      const s = h.s;
      const imgCount = this.projects[h.pi].images.length;
      if (imgCount <= 1) return;
      const now = performance.now() / 1000;
      if (mx >= h.lx - s && mx <= h.lx + s && my >= h.ly - s && my <= h.ly + s) {
        this.imageIndices[h.pi] = (this.imageIndices[h.pi] - 1 + imgCount) % imgCount;
        this.lastChange[h.pi] = now;
      }
      if (mx >= h.rx - s && mx <= h.rx + s && my >= h.ry - s && my <= h.ry + s) {
        this.imageIndices[h.pi] = (this.imageIndices[h.pi] + 1) % imgCount;
        this.lastChange[h.pi] = now;
      }
    };
    window.addEventListener("click", this._onClick);

    this._onMouseMove = (e: MouseEvent) => {
      const h = this.chevronHits;
      if (!h) { this._setCursor(false); return; }
      const mx = e.clientX, my = e.clientY;
      const s = h.s;
      const overL = mx >= h.lx - s && mx <= h.lx + s && my >= h.ly - s && my <= h.ly + s;
      const overR = mx >= h.rx - s && mx <= h.rx + s && my >= h.ry - s && my <= h.ry + s;
      if (overL) { this.hoveredChevron = "left"; this._setCursor(true); }
      else if (overR) { this.hoveredChevron = "right"; this._setCursor(true); }
      else { this.hoveredChevron = null; this._setCursor(false); }
    };
    window.addEventListener("mousemove", this._onMouseMove);
  }

  private _setCursor(pointer: boolean) {
    document.body.style.cursor = pointer ? "pointer" : "";
  }

  destroy() {
    if (this._onClick) {
      window.removeEventListener("click", this._onClick);
      this._onClick = null;
    }
    if (this._onMouseMove) {
      window.removeEventListener("mousemove", this._onMouseMove);
      this._onMouseMove = null;
    }
    this._setCursor(false);
  }

  draw(ctx: CanvasRenderingContext2D, scrollY: number, W: number, H: number, time: number) {
    const screenY = this.y - scrollY;
    const pinRange = this.scrollWidth - W;
    const scrollInto = scrollY - this.y;
    let drawY = screenY;
    let pinProgress = 0;

    if (scrollInto >= 0 && scrollInto <= pinRange) {
      drawY = 0;
      pinProgress = scrollInto / pinRange;
    } else if (scrollInto > pinRange) {
      drawY = -(scrollInto - pinRange);
      pinProgress = 1;
    }

    if (drawY + H < 0 || drawY > H) return;

    ctx.fillStyle = COL.base;
    ctx.fillRect(0, drawY, W, H);

    ctx.strokeStyle = COL.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, drawY);
    ctx.lineTo(W, drawY);
    ctx.stroke();

    const cardW = W;
    const hOff = -pinProgress * pinRange;

    for (let i = 0; i < this.projects.length; i++) {
      const p = this.projects[i];
      const cx = i * cardW + hOff;
      if (cx + cardW < -50 || cx > W + 50) continue;
      this._drawCard(ctx, p, i, cx, drawY, cardW, H, time);
    }
  }

  private _drawCard(
    ctx: CanvasRenderingContext2D,
    p: ProjectData,
    pi: number,
    cx: number, cy: number,
    cw: number, ch: number,
    time: number,
  ) {
    const mobile = cw < 480;
    const pad = mobile ? Math.max(16, cw * 0.04) : Math.max(40, cw * 0.05);
    const imgCount = p.images.length;

    const timeSince = time - this.lastChange[pi];
    if (timeSince >= CYCLE_SEC + GLITCH_SEC) {
      this.imageIndices[pi] = (this.imageIndices[pi] + 1) % imgCount;
      this.lastChange[pi] = time;
    }
    const idx = this.imageIndices[pi];
    const isGlitch = timeSince >= CYCLE_SEC && timeSince < CYCLE_SEC + GLITCH_SEC;

    const imgSrc = p.images[idx];
    const img = this.imgs.get(imgSrc);

    const isPortrait = img ? (img.naturalWidth / img.naturalHeight < 1) : false;
    const maxImgW = mobile
      ? (isPortrait ? cw * 0.55 : cw * 0.80)
      : (isPortrait ? cw * 0.65 : cw * 0.55);
    const maxImgH = mobile
      ? (isPortrait ? ch * 0.45 : ch * 0.32)
      : (isPortrait ? ch * 0.70 : ch * 0.50);
    const imgAreaW = mobile
      ? cw * 0.80
      : (isPortrait ? cw * 0.65 : cw * 0.55);

    let iw = maxImgW;
    let ih = maxImgH;
    if (img) {
      const ar = img.naturalWidth / img.naturalHeight;
      if (ar > maxImgW / maxImgH) {
        iw = maxImgW; ih = maxImgW / ar;
      } else {
        ih = maxImgH; iw = maxImgH * ar;
      }
    }

    let ix: number, iy: number;
    if (mobile) {
      ix = cx + (cw - iw) / 2;
      iy = cy + pad + 70;
    } else {
      const imgAreaLeft = cx + pad;
      ix = imgAreaLeft + (imgAreaW - iw) / 2;
      iy = cy + (ch - ih) / 2 - ch * 0.02;
    }

    const bz = 10;
    ctx.fillStyle = "#1a1714";
    ctx.fillRect(ix - bz - 4, iy - bz - 4, iw + bz * 2 + 8, ih + bz * 2 + 8);
    ctx.fillStyle = "#0f0d0a";
    ctx.fillRect(ix - bz, iy - bz, iw + bz * 2, ih + bz * 2);
    ctx.save();
    ctx.shadowColor = COL.accent;
    ctx.shadowBlur = 6;
    ctx.strokeStyle = COL.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(ix - 1, iy - 1, iw + 2, ih + 2);
    ctx.shadowBlur = 0;
    ctx.restore();

    if (isGlitch) {
      this._drawGlitch(ctx, ix, iy, iw, ih);
    } else if (img) {
      ctx.drawImage(img, ix, iy, iw, ih);
      const vg = ctx.createRadialGradient(
        ix + iw / 2, iy + ih / 2, Math.min(iw, ih) * 0.35,
        ix + iw / 2, iy + ih / 2, Math.max(iw, ih) * 0.65,
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(13,11,9,0.3)");
      ctx.fillStyle = vg;
      ctx.fillRect(ix, iy, iw, ih);
    } else {
      ctx.fillStyle = COL.surface;
      ctx.fillRect(ix, iy, iw, ih);
      ctx.fillStyle = COL.secondary;
      ctx.font = `400 13px ${FONT_MONO}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("LOADING...", ix + iw / 2, iy + ih / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    }

    const dotY = iy + ih + bz + 14;
    const dotGap = 14;
    const dotsW = imgCount * dotGap;
    const dotStartX = ix + (iw - dotsW) / 2;
    for (let d = 0; d < imgCount; d++) {
      ctx.beginPath();
      ctx.arc(dotStartX + d * dotGap + dotGap / 2, dotY, d === idx ? 3 : 1.5, 0, Math.PI * 2);
      ctx.fillStyle = d === idx ? COL.accent : COL.secondary;
      ctx.fill();
    }

    if (imgCount > 1) {
      const chevSize = mobile ? 12 : 18;
      let chevLx: number, chevRx: number, chevY: number;
      if (mobile) {
        chevY = dotY;
        chevLx = dotStartX - chevSize - 12;
        chevRx = dotStartX + dotsW + 12;
      } else {
        chevY = iy + ih / 2;
        const chevPad = bz + 20;
        chevLx = ix - chevPad - chevSize;
        chevRx = ix + iw + chevPad;
      }

      this._drawChevron(ctx, chevLx, chevY, chevSize, false, this.hoveredChevron === "left");
      this._drawChevron(ctx, chevRx, chevY, chevSize, true, this.hoveredChevron === "right");

      const cardCenter = cx + cw / 2;
      if (cardCenter > 0 && cardCenter < cw) {
        this.chevronHits = {
          lx: chevLx + chevSize / 2,
          ly: chevY,
          rx: chevRx + chevSize / 2,
          ry: chevY,
          s: chevSize + 10,
          pi,
        };
        if (mobile) {
          this.imageHit = { x: ix, y: iy, w: iw, h: ih, src: imgSrc };
        }
      }
    }

    let textX: number, textMaxW: number, textCenterY: number;
    if (mobile) {
      textX = cx + pad;
      textMaxW = cw - pad * 2;
      textCenterY = dotY + 44;
    } else {
      const textAreaStart = isPortrait ? 0.68 : 0.60;
      const textAreaWidth = isPortrait ? 0.28 : 0.35;
      textX = cx + cw * textAreaStart + pad * 0.5;
      textMaxW = cw * textAreaWidth - pad;
      textCenterY = cy + ch * 0.5;
    }

    if (!mobile) {
      const idxSize = clamp(64, cw * 0.07, 100);
      ctx.globalAlpha = 0.08;
      ctx.font = `800 ${idxSize}px ${FONT_DISPLAY}`;
      ctx.fillStyle = COL.primary;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(p.index, textX, textCenterY - ch * 0.18);
      ctx.globalAlpha = 1;
    }

    const titleSz = mobile ? clamp(24, cw * 0.06, 32) : clamp(36, cw * 0.04, 60);
    ctx.font = `800 ${titleSz}px ${FONT_DISPLAY}`;
    ctx.letterSpacing = `${-0.03 * titleSz}px`;
    ctx.fillStyle = COL.primary;
    const titleY = mobile ? textCenterY : textCenterY - ch * 0.12;
    ctx.fillText(p.title, textX, titleY);

    ctx.font = `400 11px ${FONT_MONO}`;
    ctx.letterSpacing = "2.5px";
    ctx.fillStyle = COL.secondary;
    ctx.fillText(p.category.toUpperCase(), textX, titleY + 22);
    ctx.letterSpacing = "0px";

    ctx.strokeStyle = COL.accent;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(textX, titleY + 34);
    ctx.lineTo(textX + textMaxW * 0.4, titleY + 34);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const descSz = clamp(14, cw * 0.012, 17);
    ctx.font = `italic 400 ${descSz}px ${FONT_SERIF}`;
    ctx.fillStyle = COL.accent;
    const lines = wrapText(ctx, p.description, textMaxW);
    let ly = titleY + 52;
    for (const l of lines) {
      ctx.fillText(l, textX, ly);
      ly += descSz + 6;
    }

    ly += 12;
    ctx.font = `400 10px ${FONT_MONO}`;
    ctx.letterSpacing = "1px";
    let tx = textX;
    for (const t of p.tech) {
      const tw = ctx.measureText(t).width + 16;
      if (tx + tw > textX + textMaxW && tx > textX) {
        tx = textX;
        ly += 28;
      }
      ctx.strokeStyle = COL.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ly, tw, 22);
      ctx.fillStyle = COL.secondary;
      ctx.textBaseline = "middle";
      ctx.fillText(t, tx + 8, ly + 11);
      tx += tw + 6;
    }
    ctx.letterSpacing = "0px";
    ctx.textBaseline = "alphabetic";
  }

  private _drawChevron(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, size: number, right: boolean, hovered: boolean,
  ) {
    const draw = () => {
      ctx.beginPath();
      if (right) {
        ctx.moveTo(x, y - size / 2);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size / 2);
      } else {
        ctx.moveTo(x + size, y - size / 2);
        ctx.lineTo(x, y);
        ctx.lineTo(x + size, y + size / 2);
      }
      ctx.stroke();
    };

    ctx.save();
    ctx.lineWidth = hovered ? 3 : 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = COL.accent;
    ctx.shadowColor = COL.accent;
    ctx.shadowBlur = hovered ? 30 : 18;
    draw();

    ctx.shadowBlur = hovered ? 12 : 6;
    draw();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = hovered ? COL.accent : COL.primary;
    draw();

    ctx.restore();
  }

  private _drawGlitch(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    for (let row = 0; row < h; row += 3) {
      const v = Math.random();
      const r = (v * 180 + 30) | 0;
      const g = (v * 150 + 20) | 0;
      const b = (v * 120 + 15) | 0;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y + row, w, 3);
    }
    for (let i = 0; i < 3; i++) {
      const by = y + Math.random() * h;
      ctx.fillStyle = `rgba(237,229,216,${Math.random() * 0.4})`;
      ctx.fillRect(x, by, w, 2);
    }
  }
}
