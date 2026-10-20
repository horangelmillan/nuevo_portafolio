"use client";

/*
 * ContactBlock v6 (referencia Colorlib ContactForm v6, adaptada a la marca):
 * card blanca compacta, campos solo-subrayado (Nombre + Email en fila,
 * Mensaje ancho completo), botón pill terracota con flecha y línea de
 * contacto directo abajo. Sin dependencias: Web3Forms + honeypot + time-trap.
 * La presencia lateral es un velo CSS (contact-breath), no un canvas.
 */

import { useRef, useState } from "react";
import { outfit } from "../../../../../../fonts";
import "./contact-block.css";

export const CONTACT_DISPLAY = "contacto@horangelmillan.dev";
// TODO(usuario): crea tu form en https://web3forms.com (login con email o
// GitHub) y pega la key en .env.local como NEXT_PUBLIC_WEB3FORMS_KEY=xxx
// y en Vercel → Settings → Environment Variables. Sin key el form muestra
// aviso y queda el email directo + copiar como fallback.
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "";

export default function ContactBlock() {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState({ state: "idle", msg: "" });
  const [sending, setSending] = useState(false);
  const t0 = useRef(Date.now());
  const timer = useRef(null);

  const copyEmail = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(CONTACT_DISPLAY);
      ok = true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = CONTACT_DISPLAY;
      document.body.appendChild(ta);
      ta.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      ta.remove();
    }
    if (!ok) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    // Honeypot Web3Forms: bots lo rellenan, humanos no.
    if (fd.get("botcheck")) return;
    // Time-trap: un humano tarda >3s desde que ve el form.
    if (Date.now() - (t0.current || Date.now()) < 3000) {
      setStatus({ state: "error", msg: "Espera unos segundos y vuelve a intentarlo." });
      return;
    }
    if (!ACCESS_KEY) {
      setStatus({
        state: "error",
        msg: "Form aún sin clave: usa el email directo de abajo.",
      });
      return;
    }
    setSending(true);
    setStatus({ state: "idle", msg: "" });
    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          name: String(fd.get("name") || "").slice(0, 100),
          email: String(fd.get("email") || "").slice(0, 120),
          subject: "Contacto portfolio",
          message: String(fd.get("message") || "").slice(0, 2000),
          from_name: "Portfolio horangelmillan.dev",
          botcheck: "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.success) {
        setStatus({ state: "ok", msg: "Mensaje enviado. Gracias por escribir." });
        form.reset();
      } else {
        setStatus({ state: "error", msg: "No se pudo enviar. Prueba por email directo." });
      }
    } catch {
      setStatus({ state: "error", msg: "Sin conexión. Prueba por email directo." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="contact-card">
      <div className="contact-breath" aria-hidden="true" />
      <form className={`contact-form ${outfit.className}`} onSubmit={onSubmit} noValidate={false}>
        <div className="contact-row">
          <label className="contact-field">
            <span>Tu nombre</span>
            <input name="name" required maxLength={100} autoComplete="name" placeholder="Escribe tu nombre" />
          </label>
          <label className="contact-field">
            <span>Correo electrónico</span>
            <input name="email" type="email" required maxLength={120} autoComplete="email" placeholder="Escribe tu correo electrónico" />
          </label>
        </div>
        <label className="contact-field">
          <span>Mensaje</span>
          <textarea name="message" required minLength={10} maxLength={2000} rows={3} placeholder="Escribe tu mensaje aquí…" />
        </label>
        {/* Honeypot Web3Forms: invisible para humanos */}
        <input type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" className="contact-hp" aria-hidden="true" />
        <button type="submit" className={`contact-submit ${outfit.className}`} disabled={sending}>
          {sending ? "Enviando…" : "Submit"}
        </button>
        <p className="contact-status" role="status" aria-live="polite" data-state={status.state}>{status.msg}</p>
      </form>
      <p className={`contact-direct ${outfit.className}`}>
        Si tienes alguna pregunta, escríbeme directamente:{" "}
        <button type="button" className="contact-direct-copy" onClick={copyEmail} title="Copiar email">
          {copied ? "¡Copiado!" : CONTACT_DISPLAY}
        </button>{" "}
        · <a href="https://github.com/horangelmillan" target="_blank" rel="noreferrer">GitHub</a>
        {" "}· <a href="https://www.linkedin.com/in/horangelmillan" target="_blank" rel="noreferrer">LinkedIn</a>
      </p>
    </div>
  );
}
