import type { CRTSection } from "./crt-sections";
import { COL, FONT_DISPLAY, FONT_MONO, FONT_SERIF } from "./crt-sections";

function clamp(min: number, pref: number, max: number) {
  return Math.max(min, Math.min(pref, max));
}

export interface FieldRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ContactLayout {
  name: FieldRect;
  email: FieldRect;
  message: FieldRect;
  button: FieldRect;
  mailto: FieldRect;
}

export class ContactSection implements CRTSection {
  readonly kind = "contact";
  y: number;
  height: number;

  layout: ContactLayout | null = null;
  focusedField: "name" | "email" | "message" | null = null;

  private _onClick: ((e: MouseEvent) => void) | null = null;
  private _onMouseMove: ((e: MouseEvent) => void) | null = null;
  private mailtoHit: FieldRect | null = null;

  values = { name: "", email: "", message: "" };
  status: "idle" | "sending" | "sent" | "error" = "idle";

  constructor(yStart: number) {
    this.y = yStart;
    this.height = window.innerHeight * 0.6;

    this._onClick = (e: MouseEvent) => {
      const h = this.mailtoHit;
      if (!h) return;
      const mx = e.clientX, my = e.clientY;
      if (mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h) {
        window.open("mailto:quinnlonpro@gmail.com", "_blank");
      }
    };
    window.addEventListener("click", this._onClick);

    this._onMouseMove = (e: MouseEvent) => {
      const h = this.mailtoHit;
      if (!h) return;
      const mx = e.clientX, my = e.clientY;
      const over = mx >= h.x && mx <= h.x + h.w && my >= h.y && my <= h.y + h.h;
      document.body.style.cursor = over ? "pointer" : "";
    };
    window.addEventListener("mousemove", this._onMouseMove);
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
    document.body.style.cursor = "";
  }

  draw(ctx: CanvasRenderingContext2D, scrollY: number, W: number, H: number, _time: number) {
    const screenY = this.y - scrollY;
    if (screenY + this.height < 0 || screenY > H) {
      this.layout = null;
      return;
    }

    const mobile = W < 480;
    const pad = mobile ? clamp(16, W * 0.04, 30) : clamp(40, W * 0.05, 80);

    ctx.fillStyle = COL.base;
    ctx.fillRect(0, screenY, W, this.height);

    ctx.strokeStyle = COL.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(W, screenY);
    ctx.stroke();

    const contentMaxW = Math.min(mobile ? W - pad * 2 : 580, W - pad * 2);
    const contentX = (W - contentMaxW) / 2;
    const startY = screenY + (mobile ? pad + 10 : pad + 20);

    ctx.font = `400 11px ${FONT_MONO}`;
    ctx.letterSpacing = "3px";
    ctx.fillStyle = COL.secondary;
    ctx.textBaseline = "top";
    ctx.fillText("GET IN TOUCH", contentX, startY);
    ctx.letterSpacing = "0px";

    const headSz = mobile ? clamp(32, W * 0.09, 48) : clamp(48, W * 0.07, 96);
    ctx.font = `800 ${headSz}px ${FONT_DISPLAY}`;
    ctx.letterSpacing = `${-0.03 * headSz}px`;
    ctx.fillStyle = COL.primary;
    ctx.textBaseline = "alphabetic";
    const headY = startY + 24 + headSz;
    ctx.fillText("Contact", contentX, headY);
    ctx.letterSpacing = "0px";

    const subSz = clamp(16, W * 0.018, 20);
    ctx.font = `italic 400 ${subSz}px ${FONT_SERIF}`;
    ctx.fillStyle = COL.accent;
    ctx.textBaseline = "top";
    ctx.fillText("Have a project in mind, or just want to connect?", contentX, headY + 12);

    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = COL.accent;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(contentX, headY + 12 + subSz + 16);
    ctx.lineTo(contentX + 60, headY + 12 + subSz + 16);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const fieldX = contentX;
    const fieldW = contentMaxW;
    const fieldH = mobile ? 36 : 44;
    const messageH = mobile ? 80 : 120;
    const gap = mobile ? 16 : 24;
    const labelH = mobile ? 16 : 18;
    let fy = headY + 12 + subSz + (mobile ? 24 : 40);

    if (this.status === "sent") {
      ctx.font = `400 14px ${FONT_MONO}`;
      ctx.letterSpacing = "3px";
      ctx.fillStyle = COL.accent;
      ctx.textBaseline = "top";
      ctx.textAlign = "center";
      ctx.fillText("MESSAGE SENT", contentX + contentMaxW / 2, fy + 40);
      ctx.letterSpacing = "0px";

      ctx.font = `italic 400 ${subSz}px ${FONT_SERIF}`;
      ctx.fillText("Thanks for reaching out. I'll get back to you soon.", contentX + contentMaxW / 2, fy + 68);
      ctx.textAlign = "left";

      const btnY = fy + 110;
      const btnW = 160;
      const btnX = contentX + (contentMaxW - btnW) / 2;
      this._drawButton(ctx, btnX, btnY, btnW, fieldH, "SEND ANOTHER", false);

      this.layout = {
        name: { x: 0, y: 0, w: 0, h: 0 },
        email: { x: 0, y: 0, w: 0, h: 0 },
        message: { x: 0, y: 0, w: 0, h: 0 },
        button: { x: btnX, y: btnY, w: btnW, h: fieldH },
        mailto: { x: 0, y: 0, w: 0, h: 0 },
      };
      return;
    }

    this._drawLabel(ctx, "NAME", fieldX, fy);
    fy += labelH;
    this._drawField(ctx, fieldX, fy, fieldW, fieldH, this.values.name, "Your name", this.focusedField === "name");
    const nameRect: FieldRect = { x: fieldX, y: fy, w: fieldW, h: fieldH };
    fy += fieldH + gap;

    this._drawLabel(ctx, "EMAIL", fieldX, fy);
    fy += labelH;
    this._drawField(ctx, fieldX, fy, fieldW, fieldH, this.values.email, "your@email.com", this.focusedField === "email");
    const emailRect: FieldRect = { x: fieldX, y: fy, w: fieldW, h: fieldH };
    fy += fieldH + gap;

    this._drawLabel(ctx, "MESSAGE", fieldX, fy);
    fy += labelH;
    this._drawMessageField(ctx, fieldX, fy, fieldW, messageH, this.values.message, "What's on your mind?", this.focusedField === "message");
    const messageRect: FieldRect = { x: fieldX, y: fy, w: fieldW, h: messageH };
    fy += messageH + gap;

    const btnLabel = this.status === "sending" ? "SENDING..." : this.status === "error" ? "RETRY" : "SEND MESSAGE";
    this._drawButton(ctx, fieldX, fy, fieldW, fieldH, btnLabel, false);
    const buttonRect: FieldRect = { x: fieldX, y: fy, w: fieldW, h: fieldH };

    fy += fieldH + (mobile ? 18 : 32);
    ctx.font = `400 ${mobile ? 11 : 12}px ${FONT_MONO}`;
    ctx.letterSpacing = "1px";
    ctx.fillStyle = COL.secondary;
    ctx.textBaseline = "top";
    const prefix = "Or reach me directly at ";
    const prefixW = ctx.measureText(prefix).width;
    const emailText = "quinnlonpro@gmail.com";
    ctx.fillStyle = COL.secondary;
    let emailX = fieldX + prefixW;
    let emailY = fy;
    if (mobile && prefixW + ctx.measureText(emailText).width > fieldW) {
        ctx.fillText(prefix.trim(), fieldX, fy);
      emailX = fieldX;
      emailY = fy + 18;
    } else {
      ctx.fillText(prefix, fieldX, fy);
    }
    ctx.fillStyle = COL.accent;
    ctx.fillText(emailText, emailX, emailY);
    const emailW = ctx.measureText(emailText).width;
    ctx.strokeStyle = COL.accent;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(emailX, emailY + 16);
    ctx.lineTo(emailX + emailW, emailY + 16);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.letterSpacing = "0px";
    const mailtoRect: FieldRect = { x: emailX, y: emailY, w: emailW, h: 20 };

    this.layout = {
      name: nameRect,
      email: emailRect,
      message: messageRect,
      button: buttonRect,
      mailto: mailtoRect,
    };
    this.mailtoHit = mailtoRect;
  }

  private _drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
    ctx.font = `400 10px ${FONT_MONO}`;
    ctx.letterSpacing = "2.5px";
    ctx.fillStyle = COL.secondary;
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
    ctx.letterSpacing = "0px";
  }

  private _drawField(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    value: string, placeholder: string, focused: boolean,
  ) {
    ctx.strokeStyle = focused ? COL.accent : COL.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    if (focused) {
      ctx.save();
      ctx.shadowColor = COL.accent;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = COL.accent;
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    ctx.font = `400 14px ${FONT_MONO}`;
    ctx.textBaseline = "middle";
    if (value) {
      ctx.fillStyle = COL.primary;
      ctx.fillText(value, x + 14, y + h / 2);
    } else {
      ctx.fillStyle = COL.secondary;
      ctx.globalAlpha = 0.5;
      ctx.fillText(placeholder, x + 14, y + h / 2);
      ctx.globalAlpha = 1;
    }
    ctx.textBaseline = "alphabetic";
  }

  private _drawMessageField(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    value: string, placeholder: string, focused: boolean,
  ) {
    // Border
    ctx.strokeStyle = focused ? COL.accent : COL.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    if (focused) {
      ctx.save();
      ctx.shadowColor = COL.accent;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = COL.accent;
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    ctx.font = `400 14px ${FONT_MONO}`;
    ctx.textBaseline = "top";
    if (value) {
      ctx.fillStyle = COL.primary;
      const lines = value.split("\n");
      let ly = y + 12;
      for (const line of lines) {
        if (ly + 16 > y + h - 8) break;
        ctx.fillText(line, x + 14, ly);
        ly += 18;
      }
    } else {
      ctx.fillStyle = COL.secondary;
      ctx.globalAlpha = 0.5;
      ctx.fillText(placeholder, x + 14, y + 12);
      ctx.globalAlpha = 1;
    }
    ctx.textBaseline = "alphabetic";
  }

  private _drawButton(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    label: string, hovered: boolean,
  ) {
    ctx.save();
    ctx.strokeStyle = COL.accent;
    ctx.lineWidth = 1;

    if (hovered) {
      ctx.shadowColor = COL.accent;
      ctx.shadowBlur = 20;
    }
    ctx.strokeRect(x, y, w, h);
    ctx.restore();

    ctx.font = `400 12px ${FONT_MONO}`;
    ctx.letterSpacing = "3px";
    ctx.fillStyle = COL.primary;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.letterSpacing = "0px";
  }
}
