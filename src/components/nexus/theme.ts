"use client";

import { useState, useEffect, useCallback } from "react";
import { TWEAK_DEFAULTS, STORAGE_KEY, type Tweaks, type ThemeMode } from "./theme-constants";

/**
 * NEXUS UI — motor de tema portável (hooks client-side).
 * Constantes/tipos/BOOT_SCRIPT vivem em ./theme-constants (módulo server-safe,
 * importável por client e server). NÃO re-exportamos daqui: barrel `export *`
 * em módulo "use client" quebra o bundler RSC/Turbopack. Importe as constantes
 * direto de "./theme-constants".
 */

/** Aplica os tweaks ao <html> (data-attrs + --accent-h). Idempotente. */
export function applyTweaks(t: Tweaks): void {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.dataset.style = t.style;
  el.dataset.theme = t.theme;
  el.dataset.density = t.density;
  el.style.setProperty("--accent-h", String(t.accentH));
}

function load(): Tweaks {
  if (typeof localStorage === "undefined") return { ...TWEAK_DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...TWEAK_DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...TWEAK_DEFAULTS };
}

/** Estado de preferências visuais. Aplica ao <html> e persiste a cada mudança. */
export function useTweaks() {
  const [tweaks, setTweaks] = useState<Tweaks>(load);

  useEffect(() => {
    applyTweaks(tweaks);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tweaks));
    } catch {
      /* ignore */
    }
  }, [tweaks]);

  const setTweak = useCallback(<K extends keyof Tweaks>(key: K, value: Tweaks[K]) => {
    setTweaks((prev) => ({ ...prev, [key]: value }));
  }, []);

  return { tweaks, setTweak };
}

/** Hue atual do accent (0..360). Para componentes que pintam em canvas. */
export function useAccentHue(): number {
  const read = (): number => {
    if (typeof document === "undefined") return 200;
    const v = document.documentElement.style.getPropertyValue("--accent-h").trim();
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 200;
  };
  const [hue, setHue] = useState<number>(read);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setHue(read());
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["style"] });
    return () => obs.disconnect();
  }, []);
  return hue;
}

/** Tema atual (dark/light). Para componentes canvas/JS que recebem cor como string. */
export function useDocumentTheme(): ThemeMode {
  const read = (): ThemeMode => {
    if (typeof document === "undefined") return "dark";
    return (document.documentElement.dataset.theme as ThemeMode) || "dark";
  };
  const [theme, setTheme] = useState<ThemeMode>(read);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setTheme(read());
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

// BOOT_SCRIPT vive em ./theme-constants (re-exportado acima via `export *`).
