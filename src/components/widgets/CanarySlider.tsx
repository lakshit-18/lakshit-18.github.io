import { useState, useEffect, useRef } from 'preact/hooks';
import { WidgetHeader, Status, useReducedMotion, type Tone } from './shared';
import './CanarySlider.css';

const STEPS = [0, 10, 20, 50, 100];
const START_INDEX = 2; // 20%
const TICK_MS = 100;
const PER_TICK = 10; // 100 events per second
const FAIL_EVERY = 20; // 5% of SQS publishes fail when simulated
const DOT_MS = 900;

type Route = 'sqs' | 'kafka' | 'fallback';
interface Dot { id: number; route: Route; born: number }
interface Counts { sqs: number; kafka: number; fallback: number }
const ZERO: Counts = { sqs: 0, kafka: 0, fallback: 0 };

function stage(pct: number): { label: string; tone: Tone } {
  if (pct === 0) return { label: 'Before', tone: 'muted' };
  if (pct <= 20) return { label: 'Canary', tone: 'info' };
  if (pct < 100) return { label: 'Ramp', tone: 'warn' };
  return { label: 'Cut over — next: remove fallback in a separate PR', tone: 'success' };
}

export default function CanarySlider() {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(START_INDEX);
  const [failures, setFailures] = useState(false);
  const [running, setRunning] = useState(true);
  const [counts, setCounts] = useState<Counts>(ZERO);
  const [dots, setDots] = useState<Dot[]>([]);
  const pct = STEPS[idx];

  // Deterministic router: an accumulator sends exactly pct% of events to SQS,
  // and every 20th SQS publish fails when failures are simulated.
  const sim = useRef({ acc: 0, sqsSeq: 0, dotId: 0, pct, failures });
  sim.current.pct = pct;
  sim.current.failures = failures;
  const rootRef = useRef<HTMLDivElement>(null);
  const visible = useRef(true);

  // Only simulate while the widget is on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((es) => { visible.current = es[0]?.isIntersecting ?? true; });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (!visible.current) return;
      const s = sim.current;
      const add: Counts = { sqs: 0, kafka: 0, fallback: 0 };
      let first: Route | null = null;
      for (let i = 0; i < PER_TICK; i++) {
        s.acc += s.pct / 100;
        let r: Route = 'kafka';
        if (s.acc >= 1 - 1e-9) {
          s.acc -= 1;
          s.sqsSeq++;
          r = s.failures && s.sqsSeq % FAIL_EVERY === 0 ? 'fallback' : 'sqs';
        }
        add[r]++;
        if (first === null) first = r;
      }
      setCounts((c) => ({ sqs: c.sqs + add.sqs, kafka: c.kafka + add.kafka, fallback: c.fallback + add.fallback }));
      if (!reduced && first) {
        const now = Date.now();
        const route: Route = add.fallback ? 'fallback' : first;
        setDots((ds) => [...ds.filter((d) => now - d.born < DOT_MS), { id: s.dotId++, route, born: now }]);
      }
    }, TICK_MS);
    return () => clearInterval(t);
  }, [running, reduced]);

  useEffect(() => { if (reduced || !running) setDots([]); }, [reduced, running]);

  const reset = () => {
    setIdx(START_INDEX);
    setFailures(false);
    setCounts(ZERO);
    setDots([]);
    sim.current.acc = 0;
    sim.current.sqsSeq = 0;
    setRunning(true);
  };

  const st = stage(pct);
  const total = counts.sqs + counts.kafka + counts.fallback;

  return (
    <div class="widget cs" ref={rootRef}>
      <WidgetHeader title="Kafka → SQS canary" onReset={reset} />

      <div class="cs-controls">
        <label class="cs-slider">
          <span>Traffic to SQS: <strong class="wg-mono">{pct}%</strong></span>
          <input
            type="range" class="wg-range" min="0" max={STEPS.length - 1} step="1" value={idx}
            aria-label="Traffic to SQS"
            aria-valuetext={`${pct}% to SQS, stage ${st.label}`}
            onInput={(e) => setIdx(Number(e.currentTarget.value))}
          />
          <span class="cs-ticks wg-mono wg-faint" aria-hidden="true">
            {STEPS.map((s) => <span key={s}>{s}</span>)}
          </span>
        </label>
        <div class="cs-side">
          <label class="cs-check">
            <input type="checkbox" class="wg-check" checked={failures} onChange={(e) => setFailures(e.currentTarget.checked)} />
            Simulate SQS publish failures (5%)
          </label>
          <button type="button" class="w-btn" aria-pressed={!running} onClick={() => setRunning((v) => !v)}>
            {running ? '❚❚ Pause' : '▶ Resume'}
          </button>
        </div>
      </div>

      <div class="wg-row cs-stagebar" aria-live="polite">
        <span class="wg-muted">Stage</span>
        <Status tone={st.tone} label={st.label} />
      </div>

      <div class="wg-scroll"><div class="wg-stage cs-stage">
        <svg viewBox="0 0 600 170" aria-hidden="true">
          <rect x="12" y="63" width="112" height="44" rx="8" class="cs-box" />
          <text x="68" y="89" text-anchor="middle" class="cs-label">Producer</text>
          <path d="M124 85 C220 85 240 30 440 30" class={`cs-lane${pct > 0 ? ' cs-lane-on' : ''}`} />
          <path d="M124 85 C220 85 240 140 440 140" class={`cs-lane${pct < 100 || counts.fallback ? ' cs-lane-on' : ''}`} />
          {failures && <path d="M330 38 C 360 80 380 110 440 132" class="cs-lane cs-fallback" />}
          {failures && <text x="368" y="96" class="cs-label cs-sub">fallback ↩</text>}
          <rect x="440" y="8" width="148" height="44" rx="8" class="cs-box" />
          <text x="514" y="34" text-anchor="middle" class="cs-label">SQS</text>
          <rect x="440" y="118" width="148" height="44" rx="8" class="cs-box" />
          <text x="514" y="144" text-anchor="middle" class="cs-label">Kafka</text>
        </svg>
        {dots.map((d) => <span key={d.id} class={`wg-dot cs-dot cs-r-${d.route}`} />)}
      </div></div>

      <dl class="wg-counters">
        <div><dt>Sent to SQS</dt><dd class="s-info">{counts.sqs}</dd></div>
        <div><dt>Sent to Kafka</dt><dd>{counts.kafka}</dd></div>
        <div><dt>Fallbacks (SQS → Kafka)</dt><dd class="s-warn">{counts.fallback}</dd></div>
        <div><dt>Dropped</dt><dd class="s-success"><span aria-hidden="true">✓ </span>0</dd></div>
      </dl>
      <p class="wg-note">
        {total} events published · 100 events/s (sim) · every event lands in SQS or Kafka, so dropped stays at 0.
      </p>
    </div>
  );
}
