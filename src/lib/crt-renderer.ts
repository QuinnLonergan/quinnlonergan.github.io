import type { CRTSection } from "./crt-sections";
import { COL, FONT_MONO, FONT_DISPLAY } from "./crt-sections";

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uWarp;
uniform float uScan;
uniform float uRgb;
uniform float uTime;
uniform vec2  uRes;

vec2 barrel(vec2 uv, float k) {
  vec2 cc = uv - 0.5;
  float r2 = dot(cc, cc);
  float zoom = 1.0 + k * 0.12;
  return 0.5 + cc * (1.0 + k * r2 * r2) / zoom;
}

void main() {
  vec2 uv = barrel(vUv, uWarp);

  float clip = step(0.0, uv.x) * step(uv.x, 1.0)
             * step(0.0, uv.y) * step(uv.y, 1.0);

  float shift = uRgb * 0.004;
  float r = texture2D(uTex, vec2(uv.x - shift, uv.y)).r;
  float g = texture2D(uTex, uv).g;
  float b = texture2D(uTex, vec2(uv.x + shift, uv.y)).b;

  float line = uv.y * uRes.y * 0.5;
  float scan = 1.0 - uScan * 0.2 * (1.0 - smoothstep(0.3, 0.7, fract(line)));

  vec2 vc = (uv - 0.5) * 2.0;
  float vign = 1.0 - 0.25 * pow(length(vc), 2.0);
  float corner = pow(abs(vc.x * vc.y), 0.6);
  vign -= 0.25 * corner;
  float flicker = 1.0 - 0.015 * sin(uTime * 60.0);

  gl_FragColor = vec4(vec3(r, g, b) * scan * vign * flicker * clip, 1.0);
}`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export class CRTRenderer {
  canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private offscreen: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: WebGLTexture;
  private prog: WebGLProgram;

  private uTex: WebGLUniformLocation | null;
  private uWarp: WebGLUniformLocation | null;
  private uScan: WebGLUniformLocation | null;
  private uRgb: WebGLUniformLocation | null;
  private uTime: WebGLUniformLocation | null;
  private uRes: WebGLUniformLocation | null;

  sections: CRTSection[] = [];
  scrollY = 0;
  totalHeight = 0;
  dirty = true;
  isScrolling = false;
  private alive = true;
  private time = 0;
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;

  private fontsReady = false;
  private bootStart = 0;
  private bootDone = false;
  onBootComplete: (() => void) | null = null;
  private staticCanvas: HTMLCanvasElement | null = null;
  private staticCtx: CanvasRenderingContext2D | null = null;

  private navItems = [
    { label: "CH-1  Home", section: 0 },
    { label: "CH-2  About Me", section: 1 },
    { label: "CH-3  Projects", section: 2 },
    { label: "CH-4  Contact Me", section: 3 },
  ];
  private navHits: { x: number; y: number; w: number; h: number; idx: number }[] = [];
  private navHovered = -1;
  private _navClick: ((e: MouseEvent) => void) | null = null;
  private _navMove: ((e: MouseEvent) => void) | null = null;

  cursorX = -100;
  cursorY = -100;
  private cursorTrail: { x: number; y: number; t: number }[] = [];
  private static TRAIL_LENGTH = 18;
  private static TRAIL_LIFETIME = 400; // ms

  private static BOOT_BLACK      = 300;
  private static BOOT_LINE       = 600;   // horizontal line appears
  private static BOOT_EXPAND     = 1000;  // line expands vertically
  private static BOOT_FLASH      = 1100;  // white flash peak
  private static BOOT_STATIC     = 1350;  // static noise
  private static BOOT_RESOLVE    = 1550;  // content fades through
  private static BOOT_END        = 1800;  // boot complete

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = `
      position: fixed; inset: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 100;
    `;
    this.canvas.setAttribute("aria-hidden", "true");

    this.gl = this.canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    })!;

    this.offscreen = document.createElement("canvas");
    this.ctx = this.offscreen.getContext("2d")!;

    this.prog = this._initShader();
    this.texture = this._initTexture();
    this._initQuad();

    this.uTex = this.gl.getUniformLocation(this.prog, "uTex");
    this.uWarp = this.gl.getUniformLocation(this.prog, "uWarp");
    this.uScan = this.gl.getUniformLocation(this.prog, "uScan");
    this.uRgb = this.gl.getUniformLocation(this.prog, "uRgb");
    this.uTime = this.gl.getUniformLocation(this.prog, "uTime");
    this.uRes = this.gl.getUniformLocation(this.prog, "uRes");

    this._resize();
    window.addEventListener("resize", () => this._resize());

    const onScroll = () => {
      if (!this.isScrolling) {
        this.isScrolling = true;
        this.dirty = true;
      }
      if (this.scrollTimer) clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(() => {
        this.isScrolling = false;
        this.dirty = true;
      }, 200);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    document.fonts.ready.then(() => {
      this.fontsReady = true;
      this.dirty = true;
    });
  }

  mount(parent: HTMLElement) {
    parent.appendChild(this.canvas);
    this.bootStart = performance.now();

    this._navClick = (e: MouseEvent) => {
      const mx = e.clientX, my = e.clientY;
      for (const hit of this.navHits) {
        if (mx >= hit.x && mx <= hit.x + hit.w && my >= hit.y && my <= hit.y + hit.h) {
          const section = this.sections[hit.idx];
          if (section) {
            window.scrollTo({ top: section.y, behavior: "smooth" });
          }
          break;
        }
      }
    };
    window.addEventListener("click", this._navClick);

    this._navMove = (e: MouseEvent) => {
      const mx = e.clientX, my = e.clientY;
      let found = -1;
      for (const hit of this.navHits) {
        if (mx >= hit.x && mx <= hit.x + hit.w && my >= hit.y && my <= hit.y + hit.h) {
          found = hit.idx;
          break;
        }
      }
      if (found >= 0) {
        document.body.style.cursor = "pointer";
      }
      if (found !== this.navHovered) {
        this.navHovered = found;
        this.dirty = true;
      }
    };
    window.addEventListener("mousemove", this._navMove);

    this._loop(0);
  }

  destroy() {
    this.alive = false;
    this.canvas.remove();
    if (this._navClick) {
      window.removeEventListener("click", this._navClick);
      this._navClick = null;
    }
    if (this._navMove) {
      window.removeEventListener("mousemove", this._navMove);
      this._navMove = null;
    }
    const gl = this.gl;
    gl.deleteProgram(this.prog);
    gl.deleteTexture(this.texture);
  }

  markDirty() {
    this.dirty = true;
  }

  private _initShader(): WebGLProgram {
    const gl = this.gl;
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT)!;
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG)!;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(prog));
    }
    return prog;
  }

  private _initTexture(): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return tex;
  }

  private _initQuad() {
    const gl = this.gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
      gl.STATIC_DRAW
    );
    const posLoc = gl.getAttribLocation(this.prog, "aPos");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  }

  private _resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;

    this.offscreen.width = w;
    this.offscreen.height = h;

    this.dirty = true;
  }

  private _drawBootSequence(ctx: CanvasRenderingContext2D, W: number, H: number, elapsed: number) {
    const B = CRTRenderer;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    if (elapsed < B.BOOT_BLACK) return;

    if (elapsed < B.BOOT_EXPAND) {
      const t = (elapsed - B.BOOT_BLACK) / (B.BOOT_LINE - B.BOOT_BLACK);
      const lineProgress = Math.min(1, t);
      const ease = 1 - Math.pow(1 - lineProgress, 3);

      const lineW = ease * W;
      const lineH = 2;
      const cx = W / 2;
      const cy = H / 2;

      ctx.shadowColor = "#ede5d8";
      ctx.shadowBlur = 20 * ease;
      ctx.fillStyle = "#ede5d8";
      ctx.fillRect(cx - lineW / 2, cy - lineH / 2, lineW, lineH);
      ctx.shadowBlur = 0;

      if (elapsed > B.BOOT_LINE) {
        const expandT = (elapsed - B.BOOT_LINE) / (B.BOOT_EXPAND - B.BOOT_LINE);
        const expandEase = expandT * expandT; // ease-in for expansion
        const expandH = expandEase * H;

        ctx.fillStyle = "#ede5d8";
        ctx.globalAlpha = 0.8;
        ctx.fillRect(0, cy - expandH / 2, W, expandH);
        ctx.globalAlpha = 1;
      }
      return;
    }

    if (elapsed < B.BOOT_STATIC) {
      const flashT = (elapsed - B.BOOT_EXPAND) / (B.BOOT_FLASH - B.BOOT_EXPAND);
      const staticT = (elapsed - B.BOOT_FLASH) / (B.BOOT_STATIC - B.BOOT_FLASH);

      if (elapsed < B.BOOT_FLASH) {
        const brightness = Math.max(0, 1 - flashT * 0.3);
        ctx.fillStyle = `rgba(237, 229, 216, ${brightness})`;
        ctx.fillRect(0, 0, W, H);
      } else {
        const flashFade = 1 - staticT;
        ctx.fillStyle = `rgba(237, 229, 216, ${flashFade * 0.5})`;
        ctx.fillRect(0, 0, W, H);

        ctx.globalAlpha = staticT * 0.9;
        this._drawStaticNoise(ctx, W, H);
        ctx.globalAlpha = 1;
      }
      return;
    }

    if (elapsed < B.BOOT_END) {
      const resolveT = (elapsed - B.BOOT_STATIC) / (B.BOOT_END - B.BOOT_STATIC);
      const contentAlpha = Math.min(1, (elapsed - B.BOOT_RESOLVE) / (B.BOOT_END - B.BOOT_RESOLVE));

      const staticAlpha = 1 - resolveT;
      if (staticAlpha > 0) {
        ctx.globalAlpha = staticAlpha;
        this._drawStaticNoise(ctx, W, H);
        ctx.globalAlpha = 1;
      }

      if (contentAlpha > 0) {
        ctx.globalAlpha = contentAlpha;
        this._drawContent(ctx, W, H);
        ctx.globalAlpha = 1;
      }
      return;
    }

    this._drawContent(ctx, W, H);
  }

  private _drawStaticNoise(ctx: CanvasRenderingContext2D, W: number, H: number) {
    const scale = 2;
    const sw = Math.ceil(W / scale);
    const sh = Math.ceil(H / scale);

    if (!this.staticCanvas || this.staticCanvas.width !== sw || this.staticCanvas.height !== sh) {
      this.staticCanvas = document.createElement("canvas");
      this.staticCanvas.width = sw;
      this.staticCanvas.height = sh;
      this.staticCtx = this.staticCanvas.getContext("2d")!;
    }

    const imgData = this.staticCtx!.createImageData(sw, sh);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random();
      data[i]     = (v * 200 + 20) | 0;  // R (warm tint)
      data[i + 1] = (v * 170 + 15) | 0;  // G
      data[i + 2] = (v * 130 + 10) | 0;  // B
      data[i + 3] = 255;
    }

    this.staticCtx!.putImageData(imgData, 0, 0);

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.staticCanvas, 0, 0, W, H);
    ctx.imageSmoothingEnabled = true;

    for (let i = 0; i < 5; i++) {
      const y = Math.random() * H;
      ctx.fillStyle = `rgba(237, 229, 216, ${Math.random() * 0.3})`;
      ctx.fillRect(0, y, W, 2);
    }
  }

  private _drawContent(ctx: CanvasRenderingContext2D, W: number, H: number) {
    for (const section of this.sections) {
      ctx.save();
      section.draw(ctx, this.scrollY, W, H, this.time);
      ctx.restore();
    }

    this._drawNavHeader(ctx, W);
    this._drawCursorTrail(ctx);
  }

  private _updateCursorTrail() {
    const now = performance.now();
    const trail = this.cursorTrail;

    const last = trail[trail.length - 1];
    if (!last || Math.abs(last.x - this.cursorX) > 1 || Math.abs(last.y - this.cursorY) > 1) {
      trail.push({ x: this.cursorX, y: this.cursorY, t: now });
    }

    while (trail.length > CRTRenderer.TRAIL_LENGTH) trail.shift();
    while (trail.length > 0 && now - trail[0].t > CRTRenderer.TRAIL_LIFETIME) trail.shift();
  }

  private _drawCursorTrail(ctx: CanvasRenderingContext2D) {
    const trail = this.cursorTrail;
    if (trail.length < 2) return;

    const now = performance.now();
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1];
      const curr = trail[i];
      const age = now - curr.t;
      const life = 1 - age / CRTRenderer.TRAIL_LIFETIME;
      if (life <= 0) continue;

      const progress = i / (trail.length - 1);

      const alpha = life * progress * 0.35;
      const width = 2 + progress * 3;

      ctx.globalAlpha = alpha * 0.2;
      ctx.strokeStyle = COL.accent;
      ctx.lineWidth = width + 6;
      ctx.shadowColor = COL.accent;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = COL.primary;
      ctx.lineWidth = width;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }

    if (trail.length > 0) {
      const head = trail[trail.length - 1];
      const headAge = now - head.t;
      if (headAge < 100) {
        ctx.globalAlpha = 0.45;
        ctx.shadowColor = COL.accent;
        ctx.shadowBlur = 15;
        ctx.fillStyle = COL.primary;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private _redrawOffscreen() {
    if (!this.fontsReady) return;

    const ctx = this.ctx;
    const W = this.offscreen.width;
    const H = this.offscreen.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0d0b09";
    ctx.fillRect(0, 0, W, H);

    const elapsed = performance.now() - this.bootStart;
    if (!this.bootDone) {
      this._drawBootSequence(ctx, W, H, elapsed);

      if (elapsed >= CRTRenderer.BOOT_END) {
        this.bootDone = true;
        if (this.onBootComplete) this.onBootComplete();
      }
    } else {
      this._updateCursorTrail();
      this._drawContent(ctx, W, H);
    }

    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA,
      gl.RGBA, gl.UNSIGNED_BYTE, this.offscreen
    );

    this.dirty = false;
  }

  private _drawNavHeader(ctx: CanvasRenderingContext2D, W: number) {
    const mobile = W < 480;
    const topY = mobile ? 12 : 24;
    const h = mobile ? 40 : 52;
    const fontSize = mobile ? 10 : 15;
    const ls = mobile ? "1px" : "3px";

    ctx.fillStyle = COL.base;
    ctx.fillRect(0, 0, W, topY + h);

    ctx.strokeStyle = COL.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, topY + h);
    ctx.lineTo(W, topY + h);
    ctx.stroke();

    let activeIdx = 0;
    for (let i = this.sections.length - 1; i >= 0; i--) {
      const s = this.sections[i];
      if (this.scrollY >= s.y - 100) {
        activeIdx = i;
        break;
      }
    }

    const labels = mobile
      ? this.navItems.map(n => n.label.replace(/CH-\d\s+/, ""))
      : this.navItems.map(n => n.label);

    ctx.font = `800 ${fontSize}px ${FONT_MONO}`;
    ctx.letterSpacing = ls;
    const gap = mobile ? 14 : Math.max(32, W * 0.035);
    let totalW = 0;
    const widths: number[] = [];
    for (const lbl of labels) {
      const tw = ctx.measureText(lbl).width;
      widths.push(tw);
      totalW += tw;
    }
    totalW += gap * (labels.length - 1);

    const hits: typeof this.navHits = [];
    let x = mobile ? (W - totalW) / 2 : (W - totalW) / 2;
    const cy = topY + h / 2;

    for (let i = 0; i < this.navItems.length; i++) {
      const lbl = labels[i];
      const tw = widths[i];
      const isActive = this.navItems[i].section === activeIdx;
      const isHovered = i === this.navHovered;

      ctx.save();
      ctx.font = `800 ${fontSize}px ${FONT_MONO}`;
      ctx.letterSpacing = ls;
      ctx.textBaseline = "middle";

      if (isActive || isHovered) {
        ctx.fillStyle = COL.accent;
        ctx.shadowColor = COL.accent;

        ctx.shadowBlur = isHovered ? 24 : 16;
        ctx.fillText(lbl, x, cy);

        ctx.shadowBlur = isHovered ? 10 : 6;
        ctx.fillText(lbl, x, cy);

        ctx.shadowBlur = 0;
        ctx.fillText(lbl, x, cy);

        if (isActive) {
          ctx.strokeStyle = COL.accent;
          ctx.lineWidth = 1.5;
          ctx.shadowColor = COL.accent;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(x, cy + (mobile ? 9 : 12));
          ctx.lineTo(x + tw, cy + (mobile ? 9 : 12));
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = COL.secondary;
        ctx.shadowColor = COL.secondary;
        ctx.shadowBlur = 4;
        ctx.fillText(lbl, x, cy);
        ctx.shadowBlur = 0;
        ctx.fillText(lbl, x, cy);
      }

      ctx.restore();

      hits.push({ x: x - 8, y: topY - 8, w: tw + 16, h: h + 16, idx: this.navItems[i].section });
      x += tw + gap;
    }

    this.navHits = hits;

    if (!mobile) {
      const leftPad = Math.max(40, W * 0.05);
      ctx.font = `400 11px ${FONT_MONO}`;
      ctx.letterSpacing = "3px";
      ctx.textBaseline = "middle";

      ctx.fillStyle = COL.accent;
      ctx.shadowColor = COL.accent;
      ctx.shadowBlur = 14;
      ctx.fillText("PORTFOLIO \u2014 2026", leftPad, cy);
      ctx.shadowBlur = 5;
      ctx.fillText("PORTFOLIO \u2014 2026", leftPad, cy);
      ctx.shadowBlur = 0;
      ctx.fillStyle = COL.primary;
      ctx.fillText("PORTFOLIO \u2014 2026", leftPad, cy);
      ctx.letterSpacing = "0px";
    }

    if (!mobile) {
      const rightPad = Math.max(40, W * 0.05);
      const label = "PLAY";
      const iconSz = 26;
      const txtSz = 32;
      ctx.font = `800 ${txtSz}px ${FONT_DISPLAY}`;
      ctx.letterSpacing = "2px";
      const labelW = ctx.measureText(label).width;
      const playBlockW = iconSz + 12 + labelW;
      const playBlockX = W - rightPad - playBlockW;
      const playIconY = cy - iconSz / 2;

      ctx.font = `400 11px ${FONT_MONO}`;
      ctx.letterSpacing = "3px";
      ctx.textBaseline = "bottom";
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = COL.accent;
      ctx.shadowBlur = 10;
      ctx.fillText("SCROLL TO", playBlockX, cy - iconSz / 2 - 2);
      ctx.shadowBlur = 0;
      ctx.fillText("SCROLL TO", playBlockX, cy - iconSz / 2 - 2);

      ctx.textBaseline = "middle";
      ctx.save();
      ctx.fillStyle = COL.accent;
      ctx.shadowColor = COL.accent;
      ctx.shadowBlur = 30;
      this._drawPlayPauseIcon(ctx, playBlockX, playIconY, iconSz, this.isScrolling);
      ctx.font = `800 ${txtSz}px ${FONT_DISPLAY}`;
      ctx.letterSpacing = "2px";
      ctx.textBaseline = "middle";
      ctx.fillText(label, playBlockX + iconSz + 12, cy);
      ctx.shadowBlur = 12;
      this._drawPlayPauseIcon(ctx, playBlockX, playIconY, iconSz, this.isScrolling);
      ctx.fillText(label, playBlockX + iconSz + 12, cy);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#ffffff";
      this._drawPlayPauseIcon(ctx, playBlockX, playIconY, iconSz, this.isScrolling);
      ctx.fillText(label, playBlockX + iconSz + 12, cy);
      ctx.restore();
    }
    ctx.letterSpacing = "0px";
  }

  private _drawPlayPauseIcon(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, size: number,
    isPlaying: boolean
  ) {
    if (isPlaying) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + size, y + size / 2);
      ctx.lineTo(x, y + size);
      ctx.closePath();
      ctx.fill();
    } else {
      const barW = size * 0.3;
      const gap = size * 0.15;
      const lx = x + (size - barW * 2 - gap) / 2;
      ctx.fillRect(lx, y, barW, size);
      ctx.fillRect(lx + barW + gap, y, barW, size);
    }
  }

  private _loop = (ts: number) => {
    if (!this.alive) return;
    requestAnimationFrame(this._loop);

    this.time = ts / 1000;

    if (!this.bootDone) {
      this.dirty = true;
    }

    if (this.cursorTrail.length > 0) {
      this.dirty = true;
    }

    const H = this.offscreen.height;
    for (const s of this.sections) {
      if (!s.animated) continue;
      const screenY = s.y - this.scrollY;
      const visibleRange = ('scrollWidth' in s) ? (s as any).scrollWidth as number : s.height;
      if (screenY + visibleRange > 0 && screenY < H) {
        this.dirty = true;
        break;
      }
    }

    if (this.dirty) {
      this._redrawOffscreen();
    }

    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.prog);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uTex, 0);

    gl.uniform1f(this.uTime, ts / 1000);
    gl.uniform1f(this.uWarp, 0.45);
    gl.uniform1f(this.uScan, 0.6);
    gl.uniform1f(this.uRgb, 0.3);
    gl.uniform2f(this.uRes, this.canvas.width, this.canvas.height);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };
}
