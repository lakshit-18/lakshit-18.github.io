import { useEffect, useState } from 'preact/hooks';
import './shared.css';

/** True when the user prefers reduced motion. Always false during SSR. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

export function WidgetHeader({ title, onReset }: { title: string; onReset: () => void }) {
  return (
    <div class="wg-head">
      <span class="wg-title">{title}</span>
      <button type="button" class="w-btn" onClick={onReset} aria-label={`Reset ${title}`}>
        ↺ Reset
      </button>
    </div>
  );
}

export type Tone = 'success' | 'warn' | 'danger' | 'info' | 'muted';
const GLYPH: Record<Tone, string> = { success: '✓', warn: '◐', danger: '✕', info: '●', muted: '○' };

export function Status({ tone, label }: { tone: Tone; label: string }) {
  return (
    <span class={`w-status s-${tone}`}>
      <span aria-hidden="true">{GLYPH[tone]}</span>
      {label}
    </span>
  );
}

/** Small deterministic PRNG (mulberry32). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
