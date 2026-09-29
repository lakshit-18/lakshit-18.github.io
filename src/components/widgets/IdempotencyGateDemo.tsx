import { useState, useEffect, useRef } from 'preact/hooks';
import { WidgetHeader, Status, useReducedMotion, type Tone } from './shared';
import './IdempotencyGateDemo.css';

const KEY = 'cart-123';
const ORDER = 'ORD-1';
const TTL = 900; // seconds
const SPEED = 60; // TTL shown sped up ×60
const REVEAL_MS = [450, 750, 1000];

interface Row { call: string; outcome: string; tone: Tone }
interface Kv { ttl: number; value: string }
interface Run { rows: Row[]; created: number; ok: boolean; summary: string; claims: boolean }

function plan(gate: boolean, keyExists: boolean): Run {
  if (!gate) {
    return {
      rows: [1, 2, 3].map((n) => ({ call: 'no gate → INSERT order', outcome: `created ORD-${n}`, tone: 'danger' as Tone })),
      created: 3, ok: false, claims: false, summary: '3 orders created for one cart',
    };
  }
  const put = `PutItem ${KEY} if attribute_not_exists`;
  const fail = { call: `${put} → condition failed`, outcome: `replayed ${ORDER}`, tone: 'success' as Tone };
  if (keyExists) return { rows: [fail, fail, fail], created: 0, ok: true, claims: false, summary: `0 new orders, 3 replays of ${ORDER}` };
  return {
    rows: [{ call: `${put} → OK (claimed)`, outcome: `created ${ORDER}`, tone: 'success' }, fail, fail],
    created: 1, ok: true, claims: true, summary: `1 order (${ORDER}), 2 replays`,
  };
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function IdempotencyGateDemo() {
  const reduced = useReducedMotion();
  const [gate, setGate] = useState(true);
  const [run, setRun] = useState<Run | null>(null);
  const [shown, setShown] = useState(0);
  const [kv, setKv] = useState<Kv | null>(null);
  const [msg, setMsg] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);

  // TTL countdown: one real second = 60 s of TTL.
  const live = kv !== null;
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      setKv((k) => (k ? { ...k, ttl: Math.max(0, k.ttl - SPEED) } : k));
    }, 1000);
    return () => clearInterval(t);
  }, [live]);

  useEffect(() => {
    if (kv && kv.ttl <= 0) {
      setKv(null);
      setMsg(`Key ${KEY} expired after its ${TTL}s TTL; the next send claims it again.`);
    }
  }, [kv]);

  const finish = (r: Run, i: number) => {
    setShown(i + 1);
    if (i === 0 && r.claims) setKv({ ttl: TTL, value: `{ status: COMPLETED, orderId: ${ORDER} }` });
    if (i === 2) setMsg(`${r.ok ? 'OK' : 'Problem'}: ${r.summary}.`);
  };

  const send = () => {
    clearTimers();
    const r = plan(gate, kv !== null);
    setRun(r);
    setShown(0);
    setMsg(`Sending 3 concurrent place-order requests, gate ${gate ? 'on' : 'off'}.`);
    if (reduced) { r.rows.forEach((_, i) => finish(r, i)); return; }
    timers.current = REVEAL_MS.map((ms, i) => setTimeout(() => finish(r, i), ms));
  };

  const reset = () => {
    clearTimers();
    setGate(true);
    setRun(null);
    setShown(0);
    setKv(null);
    setMsg('Reset. Store empty, no requests sent.');
  };

  const busy = run !== null && shown < 3;

  return (
    <div class="widget igd">
      <WidgetHeader title="Idempotency gate" onReset={reset} />

      <div class="wg-row igd-controls">
        <button type="button" class="w-btn" onClick={send} disabled={busy}>Send 'place order' ×3 concurrently</button>
        <button type="button" class="w-btn" aria-pressed={gate} onClick={() => setGate((g) => !g)}>
          Idempotency gate: {gate ? 'on' : 'off'}
        </button>
      </div>

      <div class="igd-grid">
        <ol class="wg-list igd-reqs" aria-label="Requests">
          {[0, 1, 2].map((i) => {
            const row = run?.rows[i];
            const done = !!row && i < shown;
            return (
              <li key={i} class="wg-panel igd-req">
                <div class="igd-rhead">
                  <span class="wg-mono">Request {i + 1}</span>
                  {!run && <Status tone="muted" label="idle" />}
                  {run && !done && <Status tone="info" label="in flight" />}
                  {done && <Status tone={row.tone} label={row.outcome} />}
                </div>
                {done && <div class="wg-mono igd-call">{row.call}</div>}
              </li>
            );
          })}
        </ol>

        <div class="wg-panel igd-kv">
          <div class="igd-kvtitle wg-faint">Key-value store</div>
          <table class="igd-table">
            <thead><tr><th scope="col">Key</th><th scope="col">TTL</th><th scope="col">Value</th></tr></thead>
            <tbody>
              {kv ? (
                <tr>
                  <td class="wg-mono">{KEY}</td>
                  <td class="wg-mono" aria-label={`${kv.ttl} seconds remaining`}>{fmt(kv.ttl)}</td>
                  <td class="wg-mono igd-val">{kv.value}</td>
                </tr>
              ) : (
                <tr><td colSpan={3} class="wg-faint">(empty)</td></tr>
              )}
            </tbody>
          </table>
          <p class="wg-note">TTL {TTL}s, clock sped up ×{SPEED}.</p>
        </div>
      </div>

      <div class="igd-result">
        {run && shown >= 3
          ? <Status tone={run.ok ? 'success' : 'danger'} label={`${run.summary}`} />
          : <Status tone="muted" label={run ? 'waiting for responses…' : 'no requests sent'} />}
      </div>

      <p class="visually-hidden" aria-live="polite">{msg}</p>
    </div>
  );
}
