import { useState, useEffect, useRef } from 'preact/hooks';
import { WidgetHeader, Status, useReducedMotion, makeRng, type Tone } from './shared';
import './CircuitBreakerSim.css';

type Breaker = 'CLOSED' | 'OPEN' | 'HALF-OPEN';

const WINDOW = 10;
const THRESHOLD = 0.5;
const OPEN_FOR = 5; // seconds of sim time
const TRIALS = 3;
const TICK_MS = 200; // 5 requests per second
const TICK_S = TICK_MS / 1000;
const SEED = 42;
const DOT_MS = 800;

interface Sim {
  state: Breaker;
  window: boolean[]; // true = failure
  openedAt: number;
  trials: number;
  time: number;
  total: number;
  ok: number;
  fail: number;
  failovers: number;
}

interface Dot { id: number; to: 'primary' | 'backup'; failed: boolean; born: number }

const initialSim = (): Sim => ({
  state: 'CLOSED', window: [], openedAt: 0, trials: 0, time: 0, total: 0, ok: 0, fail: 0, failovers: 0,
});

const TONE: Record<Breaker, Tone> = { CLOSED: 'success', OPEN: 'danger', 'HALF-OPEN': 'warn' };

/** One request through the breaker. Pure except for the injected random draw. */
function step(s: Sim, failRate: number, r: number): { next: Sim; dot: Omit<Dot, 'id' | 'born'>; msg: string | null } {
  const n: Sim = { ...s, time: s.time + TICK_S, total: s.total + 1 };
  let msg: string | null = null;
  if (n.state === 'OPEN' && n.time - n.openedAt >= OPEN_FOR) {
    n.state = 'HALF-OPEN';
    n.trials = 0;
    msg = `Open for ${OPEN_FOR}s: breaker HALF-OPEN, allowing ${TRIALS} trial calls.`;
  }
  if (n.state === 'OPEN') {
    n.failovers++;
    return { next: n, dot: { to: 'backup', failed: false }, msg };
  }
  const failed = r < failRate;
  if (failed) n.fail++; else n.ok++;
  if (n.state === 'HALF-OPEN') {
    if (failed) {
      n.state = 'OPEN'; n.openedAt = n.time; n.window = [];
      msg = 'Trial call failed: breaker OPEN again, routing to backup.';
    } else if (++n.trials >= TRIALS) {
      n.state = 'CLOSED'; n.window = [];
      msg = `${TRIALS} trial calls succeeded: breaker CLOSED, primary restored.`;
    }
  } else {
    n.window = [...n.window, failed].slice(-WINDOW);
    const fails = n.window.filter(Boolean).length;
    if (n.window.length >= WINDOW && fails / WINDOW >= THRESHOLD) {
      n.state = 'OPEN'; n.openedAt = n.time;
      msg = `${fails} of last ${WINDOW} calls failed: breaker OPEN, failing over to backup.`;
    }
  }
  return { next: n, dot: { to: 'primary', failed }, msg };
}

export default function CircuitBreakerSim() {
  const reduced = useReducedMotion();
  const [failPct, setFailPct] = useState(10);
  const [sending, setSending] = useState(false);
  const [sim, setSim] = useState<Sim>(initialSim);
  const [dots, setDots] = useState<Dot[]>([]);
  const [msg, setMsg] = useState('Breaker CLOSED. Press "Send requests" to start.');
  const simRef = useRef<Sim>(sim);
  const rngRef = useRef(makeRng(SEED));
  const rateRef = useRef(failPct);
  const idRef = useRef(0);
  rateRef.current = failPct;

  useEffect(() => {
    if (!sending) return;
    const t = setInterval(() => {
      const { next, dot, msg: m } = step(simRef.current, rateRef.current / 100, rngRef.current());
      simRef.current = next;
      setSim(next);
      if (m) setMsg(m);
      if (!reduced) {
        const now = Date.now();
        setDots((ds) => [...ds.filter((d) => now - d.born < DOT_MS), { ...dot, id: idRef.current++, born: now }]);
      }
    }, TICK_MS);
    return () => clearInterval(t);
  }, [sending, reduced]);

  useEffect(() => { if (reduced || !sending) setDots([]); }, [reduced, sending]);

  const reset = () => {
    setSending(false);
    const s = initialSim();
    simRef.current = s;
    rngRef.current = makeRng(SEED);
    setSim(s);
    setDots([]);
    setFailPct(10);
    setMsg('Reset. Breaker CLOSED, counters at zero.');
  };

  const fails = sim.window.filter(Boolean).length;
  const openLeft = Math.max(0, OPEN_FOR - (sim.time - sim.openedAt));

  return (
    <div class="widget cbs">
      <WidgetHeader title="Circuit breaker · failover" onReset={reset} />

      <div class="cbs-controls">
        <label class="cbs-slider">
          <span>Gateway health: <strong class="wg-mono">{failPct}%</strong> failure rate</span>
          <input
            type="range" class="wg-range" min="0" max="100" step="5" value={failPct}
            aria-label="Gateway health: primary failure rate"
            aria-valuetext={`${failPct}% failure rate`}
            onInput={(e) => setFailPct(Number(e.currentTarget.value))}
          />
        </label>
        <button type="button" class="w-btn" aria-pressed={sending} onClick={() => setSending((v) => !v)}>
          {sending ? '❚❚ Sending (5/s)' : '▶ Send requests'}
        </button>
      </div>

      <div class="wg-row cbs-state">
        <span class="wg-muted">Breaker</span>
        <Status tone={TONE[sim.state]} label={sim.state} />
        {sim.state === 'OPEN' && <span class="wg-faint wg-mono">half-open in {openLeft.toFixed(1)}s</span>}
        {sim.state === 'HALF-OPEN' && <span class="wg-faint wg-mono">trials {sim.trials}/{TRIALS}</span>}
        <span class="wg-faint wg-mono cbs-clock">t={sim.time.toFixed(1)}s</span>
      </div>

      <div class="wg-scroll"><div class="wg-stage cbs-stage">
        <svg viewBox="0 0 600 180" aria-hidden="true">
          <rect x="16" y="68" width="104" height="44" rx="8" class="cbs-box" />
          <text x="68" y="94" text-anchor="middle" class="cbs-label">Client</text>
          <path d="M120 90 L440 40" class={`cbs-route${sim.state !== 'OPEN' ? ' cbs-route-on' : ''}`} />
          <path d="M120 90 L440 140" class={`cbs-route${sim.state === 'OPEN' ? ' cbs-route-on' : ''}`} />
          <rect x="440" y="18" width="150" height="44" rx="8" class="cbs-box" />
          <text x="515" y="44" text-anchor="middle" class="cbs-label">Primary gateway</text>
          <rect x="440" y="118" width="150" height="44" rx="8" class="cbs-box" />
          <text x="515" y="137" text-anchor="middle" class="cbs-label">Backup gateway</text>
          <text x="515" y="152" text-anchor="middle" class="cbs-label cbs-sub">(Cashfree)</text>
          <rect x="228" y="78" width="104" height="26" rx="8" class={`cbs-breaker cbs-b-${TONE[sim.state]}`} />
          <text x="280" y="95" text-anchor="middle" class="cbs-label cbs-sub">{sim.state}</text>
        </svg>
        {dots.map((d) => (
          <span key={d.id} class={`wg-dot cbs-dot cbs-to-${d.to}${d.failed ? ' cbs-failed' : ''}`} />
        ))}
      </div></div>

      <div class="cbs-window" aria-label={`Last ${WINDOW} primary calls: ${fails} failed`} role="img">
        <span class="wg-faint">Last {WINDOW} calls</span>
        {Array.from({ length: WINDOW }, (_, i) => {
          const v = sim.window[i];
          return (
            <span key={i} class={`cbs-cell ${v === undefined ? 'wg-faint' : v ? 's-danger' : 's-success'}`} aria-hidden="true">
              {v === undefined ? '·' : v ? '✕' : '✓'}
            </span>
          );
        })}
        <span class="wg-mono">{fails}/{WINDOW} failed</span>
      </div>

      <dl class="wg-counters">
        <div><dt>Total requests</dt><dd>{sim.total}</dd></div>
        <div><dt>Primary successes</dt><dd class="s-success">{sim.ok}</dd></div>
        <div><dt>Primary failures</dt><dd class="s-danger">{sim.fail}</dd></div>
        <div><dt>Failovers to backup</dt><dd class="s-info">{sim.failovers}</dd></div>
      </dl>

      <p class="visually-hidden" aria-live="polite">{msg}</p>

      <ul class="wg-list cbs-params wg-muted">
        <li>Opens at ≥{THRESHOLD * 100}% failures over the last {WINDOW} calls</li>
        <li>Stays open {OPEN_FOR}s (sim time)</li>
        <li>Half-open allows {TRIALS} trial calls</li>
      </ul>
      <p class="wg-note">Illustrative parameters; production thresholds differ.</p>
    </div>
  );
}
