export interface CRTSection {
  y: number;
  height: number;
  animated?: boolean;
  draw(ctx: CanvasRenderingContext2D, scrollY: number, W: number, H: number, time: number): void;
}

/* Colours (mirror CSS vars) */
export const COL = {
  base:      "#0d0b09",
  surface:   "#141210",
  border:    "#2a2520",
  primary:   "#ede5d8",
  secondary: "#8a7f72",
  accent:    "#c8a97e",
};

export const FONT_DISPLAY = "Archivo, sans-serif";
export const FONT_MONO    = "'DM Mono', monospace";
export const FONT_SERIF   = "'Instrument Serif', serif";

function clamp(min: number, preferred: number, max: number) {
  return Math.max(min, Math.min(preferred, max));
}

function vw(pct: number) { return window.innerWidth * pct / 100; }

function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export class HeaderSection implements CRTSection {
  y = 0;
  height = 50; // sticky header height in px
  elapsed = 0;

  private formatTime(s: number): string {
    const h = String(Math.floor(s / 3600)).padStart(2, "0");
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const sec = String(s % 60).padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }

  draw(ctx: CanvasRenderingContext2D, _scrollY: number, W: number, _H: number, _time: number) {
    const mobile = W < 480;
    const h = this.height;
    const pad = mobile ? 16 : 32;

    ctx.fillStyle = COL.base;
    ctx.fillRect(0, 0, W, h);
    drawLine(ctx, 0, h, W, h, COL.border);

    ctx.font = `400 ${mobile ? 8 : 10}px ${FONT_MONO}`;
    ctx.letterSpacing = mobile ? "1px" : "2px";
    ctx.fillStyle = COL.primary;
    ctx.textBaseline = "middle";
    ctx.fillText("QUINN LONERGAN", pad, h * 0.35);

    ctx.fillStyle = COL.secondary;
    ctx.fillText("CREATIVE ENGINEER", pad, h * 0.65);

    if (!mobile) {
      const cx = W / 2;
      drawLine(ctx, cx - 50, h * 0.3, cx + 50, h * 0.3, COL.border);
      drawLine(ctx, cx - 50, h * 0.7, cx + 50, h * 0.7, COL.border);
      for (let i = -3; i <= 3; i++) {
        const sx = cx + i * 14;
        ctx.strokeStyle = COL.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(sx - 2.5, h * 0.42, 5, 8);
      }
    }

    ctx.fillStyle = COL.secondary;
    ctx.textAlign = "right";
    ctx.fillText(this.formatTime(this.elapsed), W - pad, h * 0.5);
    ctx.textAlign = "left";

    ctx.letterSpacing = "0px";
  }
}

export class HeroSection implements CRTSection {
  y = 0;
  height: number;
  animated = true;

  labelOpacity = 0;
  line1Opacity = 0;
  line1Y = 60;
  line2Opacity = 0;
  line2Y = 60;
  quoteOpacity = 0;
  reelOpacity = 0;
  reelY = 30;

  constructor() {
    this.height = window.innerHeight;
  }

  draw(ctx: CanvasRenderingContext2D, scrollY: number, W: number, H: number, _time: number) {
    const screenY = this.y - scrollY;
    if (screenY + this.height < 0 || screenY > H) return;

    const mobile = W < 480;
    const pad = mobile ? clamp(20, vw(5), 40) : clamp(40, vw(5), 80);

    ctx.fillStyle = COL.base;
    ctx.fillRect(0, screenY, W, this.height);

    ctx.globalAlpha = this.labelOpacity;
    ctx.font = `400 ${mobile ? 11 : 13}px ${FONT_MONO}`;
    ctx.letterSpacing = mobile ? "2px" : "3px";
    ctx.textBaseline = "top";

    ctx.textAlign = "left";

    const headlineSize = mobile ? clamp(48, vw(13), 72) : clamp(72, vw(12), 160);
    const modelCanvas = (window as any).__crtModelCanvas as HTMLCanvasElement | null;

    let centerY: number;
    if (mobile) {
      centerY = screenY + this.height * 0.22 + headlineSize;
    } else {
      const totalTextH = headlineSize * 1.84;
      centerY = screenY + this.height * 0.5 - totalTextH * 0.5 + headlineSize;
    }

    ctx.font = `800 ${headlineSize}px ${FONT_DISPLAY}`;
    ctx.letterSpacing = `${-0.03 * headlineSize}px`;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = COL.primary;

    ctx.globalAlpha = this.line1Opacity;
    ctx.fillText("Quinn", pad, centerY + this.line1Y);

    ctx.globalAlpha = this.line2Opacity;
    ctx.fillText("Lonergan", pad, centerY + headlineSize * 0.92 + this.line2Y);

    ctx.globalAlpha = this.quoteOpacity;
    const quoteSz = mobile ? clamp(14, vw(3.5), 18) : clamp(18, vw(2.2), 24);
    ctx.font = `italic 400 ${quoteSz}px ${FONT_SERIF}`;
    ctx.letterSpacing = "0px";
    ctx.fillStyle = COL.accent;
    const quoteY = centerY + headlineSize * 0.92 + (mobile ? 36 : 50);
    let quoteBottom = quoteY;
    if (mobile) {
      const quoteMaxW = W - pad * 2;
      const words = "Frontend focused, tech neophile, film lover.".split(" ");
      let line = "";
      let qy = quoteY;
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > quoteMaxW && line) {
          ctx.fillText(line, pad, qy);
          qy += quoteSz + 4;
          line = word;
        } else {
          line = test;
        }
      }
      if (line) { ctx.fillText(line, pad, qy); quoteBottom = qy + quoteSz; }
    } else {
      ctx.fillText("Frontend focused, tech neophile, film lover.                 Code as craft.", pad, quoteY);
    }

    if (!mobile) {
      ctx.globalAlpha = this.reelOpacity;
      ctx.save();
      ctx.font = `400 ${13}px ${FONT_MONO}`;
      ctx.letterSpacing = "3px";
      ctx.fillStyle = COL.secondary;
      ctx.translate(W - pad, screenY + this.height - pad + this.reelY);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "left";
      ctx.fillText("REEL", 0, 0);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.letterSpacing = "0px";

    if (modelCanvas && modelCanvas.width > 0) {
      const scrollFade = mobile ? 1 : 1 - Math.min(1, scrollY / (this.height * 0.6));
      if (scrollFade > 0) {
        const mw = modelCanvas.width;
        const mh = modelCanvas.height;
        let mx: number, my: number;
        if (mobile) {
          mx = (W - mw) / 2;
          my = quoteBottom + 20;
        } else {
          mx = W - vw(5) - mw;
          my = screenY + this.height * 0.5 - mh * 0.45;
        }
        ctx.globalAlpha = scrollFade * 0.15;
        const glow = ctx.createRadialGradient(
          mx + mw / 2, my + mh / 2, mw * 0.1,
          mx + mw / 2, my + mh / 2, mw * 0.7,
        );
        glow.addColorStop(0, COL.accent);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(mx - mw * 0.3, my - mh * 0.3, mw * 1.6, mh * 1.6);

        ctx.globalAlpha = scrollFade;
        ctx.drawImage(modelCanvas, mx, my, mw, mh);
        ctx.globalAlpha = 1;
      }
    }
  }
}

