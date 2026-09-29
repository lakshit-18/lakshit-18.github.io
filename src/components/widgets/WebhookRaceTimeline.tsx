import { useState, useEffect } from 'preact/hooks';
import { WidgetHeader, Status, useReducedMotion, type Tone } from './shared';
import './WebhookRaceTimeline.css';

type Lane = 'app' | 'hook';
interface Ev { t: number; lane: Lane; label: string; tone: Tone; text: string }
interface Scenario { id: string; name: string; events: Ev[]; ok: boolean; result: string }

const SCENARIOS: Scenario[] = [
  {
    id: 'none', name: 'No protection', ok: false, result: 'Two orders',
    events: [
      { t: 0.2, lane: 'app', label: 'read: pending', tone: 'info', text: 'App callback reads the payment: not completed.' },
      { t: 0.5, lane: 'hook', label: 'read: pending', tone: 'info', text: 'Gateway webhook reads the payment: also not completed.' },
      { t: 1.0, lane: 'app', label: 'complete', tone: 'warn', text: 'App callback completes the payment.' },
      { t: 1.3, lane: 'hook', label: 'complete', tone: 'warn', text: 'Webhook completes the same payment again.' },
      { t: 1.7, lane: 'app', label: 'order #1', tone: 'danger', text: 'App callback places order #1.' },
      { t: 2.1, lane: 'hook', label: 'order #2', tone: 'danger', text: 'Webhook places order #2. Duplicate order.' },
    ],
  },
  {
    id: 'lock', name: 'With lock + terminal guard', ok: true, result: 'One order',
    events: [
      { t: 0.2, lane: 'app', label: 'lock', tone: 'info', text: 'App callback acquires the payment lock.' },
      { t: 0.5, lane: 'hook', label: 'arrives', tone: 'info', text: 'Webhook arrives while the lock is held.' },
      { t: 0.7, lane: 'hook', label: 'lock busy', tone: 'warn', text: 'Webhook fails to get the lock and waits.' },
      { t: 0.9, lane: 'app', label: 'poll', tone: 'muted', text: 'App polls the gateway (1 of 3).' },
      { t: 1.2, lane: 'app', label: 'poll', tone: 'muted', text: 'App polls the gateway (2 of 3).' },
      { t: 1.5, lane: 'app', label: 'poll', tone: 'muted', text: 'App polls the gateway (3 of 3): captured.' },
      { t: 1.8, lane: 'app', label: 'SUCCESSFUL', tone: 'success', text: 'App sets SUCCESSFUL, places the order and releases the lock.' },
      { t: 2.2, lane: 'hook', label: 'reads SUCCESSFUL', tone: 'success', text: 'Webhook gets the lock and reads SUCCESSFUL, a terminal state.' },
      { t: 2.5, lane: 'hook', label: 'exit', tone: 'muted', text: 'Terminal guard: webhook exits without side effects.' },
    ],
  },
  {
    id: 'late', name: "Late 'pending' webhook", ok: true, result: 'Status stays SUCCESSFUL',
    events: [
      { t: 0.3, lane: 'app', label: 'lock + poll', tone: 'info', text: 'App callback takes the lock and polls the gateway.' },
      { t: 1.0, lane: 'app', label: 'SUCCESSFUL', tone: 'success', text: 'Payment marked SUCCESSFUL at t=1s.' },
      { t: 1.3, lane: 'app', label: 'order', tone: 'success', text: 'Order placed; lock released.' },
      { t: 2.5, lane: 'hook', label: "'pending'", tone: 'warn', text: "A delayed 'pending' webhook arrives at t=2.5s." },
      { t: 2.7, lane: 'hook', label: 'reject', tone: 'danger', text: 'Guard rejects the downgrade SUCCESSFUL → PENDING.' },
      { t: 2.9, lane: 'hook', label: 'audit', tone: 'info', text: 'Raw payload stored for audit.' },
    ],
  },
];

const LANES: { id: Lane; name: string; y: number }[] = [
  { id: 'app', name: 'App callback', y: 58 },
  { id: 'hook', name: 'Gateway webhook', y: 132 },
];
const X0 = 124, X1 = 656;
const tx = (t: number) => X0 + ((X1 - X0) * t) / 3;
const TICKS = [0, 0.5, 1, 1.5, 2, 2.5, 3];
const STEP_MS = 800;

export default function WebhookRaceTimeline() {
  const reduced = useReducedMotion();
  const [sid, setSid] = useState(SCENARIOS[0].id);
  const sc = SCENARIOS.find((s) => s.id === sid) ?? SCENARIOS[0];
  const total = sc.events.length;
  // Number of events revealed; SSR shows the default scenario's final timeline.
  const [shown, setShown] = useState(total);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || reduced) return;
    const t = setInterval(() => {
      setShown((n) => Math.min(n + 1, total));
    }, STEP_MS);
    return () => clearInterval(t);
  }, [playing, reduced, total]);

  useEffect(() => {
    if (playing && shown >= total) setPlaying(false);
  }, [shown, total, playing]);

  const choose = (id: string) => {
    setPlaying(false);
    setSid(id);
    const s = SCENARIOS.find((x) => x.id === id);
    setShown(s ? s.events.length : 0);
  };

  const onPlay = () => {
    if (playing) { setPlaying(false); return; }
    if (reduced) { setShown(total); return; }
    if (shown >= total) setShown(0);
    setPlaying(true);
  };

  const onStep = () => {
    setPlaying(false);
    setShown((n) => (n >= total ? 1 : n + 1));
  };

  const reset = () => {
    setPlaying(false);
    setSid(SCENARIOS[0].id);
    setShown(SCENARIOS[0].events.length);
  };

  const done = shown >= total;
  const last = shown > 0 ? sc.events[shown - 1] : null;
  const head = last ? tx(last.t) : X0;
  const laneName = (l: Lane) => LANES.find((x) => x.id === l)?.name ?? l;
  const narration = shown === 0
    ? 'Timeline cleared. Press Play or Step.'
    : `t=${last!.t.toFixed(1)}s · ${laneName(last!.lane)}: ${last!.text}${done ? ` Result: ${sc.result}.` : ''}`;

  // Alternate label position per lane so neighbouring labels don't collide.
  const counts: Record<Lane, number> = { app: 0, hook: 0 };

  return (
    <div class="widget wrt">
      <WidgetHeader title="Callback vs webhook race" onReset={reset} />

      <div class="wg-row wrt-controls">
        <label class="wrt-select">
          <span class="wg-muted">Scenario</span>
          <select value={sid} onChange={(e) => choose(e.currentTarget.value)} aria-label="Scenario">
            {SCENARIOS.map((s, i) => <option key={s.id} value={s.id}>{`${i + 1}. ${s.name}`}</option>)}
          </select>
        </label>
        <button type="button" class="w-btn" onClick={onPlay} aria-pressed={reduced ? undefined : playing}>
          {playing ? '❚❚ Pause' : reduced ? '▶ Show all' : '▶ Play'}
        </button>
        <button type="button" class="w-btn" onClick={onStep} aria-label="Step to next event">Step ›</button>
      </div>

      <div class="wg-scroll">
        <svg class="wrt-svg" viewBox="0 0 680 190" role="img" aria-label={`Timeline for scenario: ${sc.name}. ${shown} of ${total} events shown.`}>
          {LANES.map((l) => (
            <g key={l.id}>
              <text x="8" y={l.y + 4} class="wrt-lane">{l.name}</text>
              <line x1={X0} x2={X1} y1={l.y} y2={l.y} class="wrt-track" />
            </g>
          ))}
          <line x1={X0} x2={X1} y1="172" y2="172" class="wrt-axis" />
          {TICKS.map((t) => (
            <g key={t}>
              <line x1={tx(t)} x2={tx(t)} y1="168" y2="176" class="wrt-axis" />
              <text x={tx(t)} y="188" text-anchor="middle" class="wrt-tick">{`${t}s`}</text>
            </g>
          ))}
          {shown > 0 && !done && <line x1={head} x2={head} y1="24" y2="168" class="wrt-head" />}
          {sc.events.map((e, i) => {
            const lane = LANES.find((l) => l.id === e.lane)!;
            const above = counts[e.lane]++ % 2 === 0;
            if (i >= shown) return null;
            return (
              <g key={`${sc.id}-${i}`} class={`wrt-ev s-${e.tone}${i === shown - 1 ? ' wrt-cur' : ''}`}>
                <circle cx={tx(e.t)} cy={lane.y} r="6" />
                <text x={tx(e.t)} y={above ? lane.y - 12 : lane.y + 21} text-anchor="middle">{e.label}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <div class="wrt-result">
        {done
          ? <Status tone={sc.ok ? 'success' : 'danger'} label={`Result: ${sc.result}`} />
          : <Status tone="muted" label={`${shown}/${total} events`} />}
      </div>

      <p class="visually-hidden" aria-live="polite">{narration}</p>

      <ol class="wrt-log">
        {sc.events.slice(0, shown).map((e, i) => (
          <li key={i}>
            <span class="wg-mono wg-faint">{`t=${e.t.toFixed(1)}s`}</span>{' '}
            <span class="wg-mono">{laneName(e.lane)}</span>: {e.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
