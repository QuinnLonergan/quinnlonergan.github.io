"use client";

import { useEffect, useRef } from "react";

export default function GrainOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameCount = 0;
    let animId: number;

    const scale = 0.5;
    let imageData: ImageData;
    let data: Uint8ClampedArray;

    const resize = () => {
      canvas.width = Math.ceil(window.innerWidth * scale);
      canvas.height = Math.ceil(window.innerHeight * scale);
      imageData = ctx.createImageData(canvas.width, canvas.height);
      data = imageData.data;
    };

    const lutR = new Uint8Array(256);
    const lutG = new Uint8Array(256);
    const lutB = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      lutR[i] = (i * 0.78) | 0;
      lutG[i] = (i * 0.66) | 0;
      lutB[i] = (i * 0.49) | 0;
    }

    const draw = () => {
      animId = requestAnimationFrame(draw);
      frameCount++;

      if (frameCount % 3 !== 0) return;

      const len = data.length;

      for (let i = 0; i < len; i += 4) {
        const v = (Math.random() * 255) | 0;
        data[i] = lutR[v];
        data[i + 1] = lutG[v];
        data[i + 2] = lutB[v];
        data[i + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 102,
        pointerEvents: "none",
        opacity: 0.12,
        mixBlendMode: "overlay",
      }}
    />
  );
}
