"use client";

import { useEffect, useRef, useCallback, useState, FormEvent } from "react";
import { createPortal } from "react-dom";
import type { ContactSection as ContactSectionType, FieldRect } from "@/lib/crt-contact-section";

const FORMSPREE_ID = "mkokqgpw";

function applyRect(el: HTMLElement | null, r: FieldRect | undefined) {
  if (!el || !r) return;
  el.style.left = `${r.x}px`;
  el.style.top = `${r.y}px`;
  el.style.width = `${r.w}px`;
  el.style.height = `${r.h}px`;
}

export default function ContactSection() {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const rafRef = useRef<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const getSection = useCallback((): ContactSectionType | null => {
    const renderer = (window as any).__crtRenderer;
    if (!renderer) return null;
    for (const s of renderer.sections) {
      if ((s as any).kind === "contact") return s as ContactSectionType;
    }
    return null;
  }, []);

  useEffect(() => {
    const sync = () => {
      const section = getSection();
      if (section) {
        section.values = {
          name: nameRef.current?.value || "",
          email: emailRef.current?.value || "",
          message: messageRef.current?.value || "",
        };

        const active = document.activeElement;
        if (active === nameRef.current) section.focusedField = "name";
        else if (active === emailRef.current) section.focusedField = "email";
        else if (active === messageRef.current) section.focusedField = "message";
        else section.focusedField = null;

        const renderer = (window as any).__crtRenderer;
        if (section.focusedField && renderer) renderer.markDirty();

        const L = section.layout;
        if (L) {
          applyRect(nameRef.current, L.name);
          applyRect(emailRef.current, L.email);
          applyRect(messageRef.current, L.message);
          applyRect(btnRef.current, L.button);
        }
      }
      rafRef.current = requestAnimationFrame(sync);
    };
    rafRef.current = requestAnimationFrame(sync);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getSection]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const section = getSection();
    if (section) section.status = "sending";
    const renderer = (window as any).__crtRenderer;
    renderer?.markDirty();

    const data = new FormData(e.currentTarget);

    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (section) section.status = res.ok ? "sent" : "error";
      if (res.ok) formRef.current?.reset();
    } catch {
      if (section) section.status = "error";
    }
    renderer?.markDirty();
  };

  const formEl = (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      style={{ position: "fixed", top: 0, left: 0, width: 0, height: 0, pointerEvents: "none", zIndex: 200 }}
    >
      <input
        ref={nameRef}
        name="name"
        type="text"
        required
        autoComplete="name"
        aria-label="Name"
        style={fixedInput}
      />
      <input
        ref={emailRef}
        name="email"
        type="email"
        required
        autoComplete="email"
        aria-label="Email"
        style={fixedInput}
      />
      <textarea
        ref={messageRef}
        name="message"
        required
        aria-label="Message"
        style={fixedInput}
      />
      <button ref={btnRef} type="submit" style={{ ...fixedInput, cursor: "pointer" }}>
        Send
      </button>
    </form>
  );

  return (
    <>
      <section style={{ height: "60vh" }} aria-hidden="true" />
      {mounted && createPortal(formEl, document.body)}
    </>
  );
}

const fixedInput: React.CSSProperties = {
  position: "fixed",
  zIndex: 200,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "transparent",
  caretColor: "transparent",
  fontSize: 14,
  fontFamily: "var(--font-mono)",
  padding: "14px 16px",
  pointerEvents: "all",
  resize: "none",
};
