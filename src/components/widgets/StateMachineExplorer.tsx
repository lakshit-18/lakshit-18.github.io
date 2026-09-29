import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import {
  CART_STATES, CART_HAPPY_PATH, CART_WIDTH,
  ORDER_STATES, ORDER_HAPPY_PATH, ORDER_WIDTH,
  CHECKPOINTS, SM_GEOMETRY as G,
  type StateDef, type StateKind,
} from '../../data/stateMachine';
import { WidgetHeader, Status, useReducedMotion, type Tone } from './shared';
import './StateMachineExplorer.css';

const HW = G.nodeW / 2;
const HH = G.nodeH / 2;
const LANE_DOWN = (G.rowHappy + G.rowFail) / 2 - 15;
const LANE_UP = (G.rowHappy + G.rowFail) / 2 - 3;

const KIND_TONE: Record<StateKind, Tone> = { start: 'info', happy: 'success', failure: 'danger', terminal: 'muted' };

/** Clip a centre-to-centre segment to the node rectangle border. */
function clip(cx: number, cy: number, dx: number, dy: number, pad: number): [number, number] {
  const t = Math.min(dx ? (HW + pad) / Math.abs(dx) : Infinity, dy ? (HH + pad) / Math.abs(dy) : Infinity);
  return [cx + dx * t, cy + dy * t];
}

function edgePath(a: StateDef, b: StateDef): string {
  const up = a.y === G.rowHappy;
  if (a.id === b.id) {
    const s = up ? -1 : 1;
    const x1 = a.x - HW + 26, y1 = a.y + s * HH;
    const x2 = a.x - HW, y2 = a.y + s * (HH - 12);
    return `M${x1} ${y1} C${x1} ${y1 + s * 26} ${x2 - 26} ${y2} ${x2 - 3} ${y2}`;
  }
  if (b.y === G.rowAbort) {
    if (up) return `M${a.x + HW} ${a.y + 12} H${a.x + G.colW / 2} V${b.y} H${b.x - HW - 3}`;
    return `M${a.x} ${a.y + HH} V${b.y} H${b.x - HW - 3}`;
  }
  const dcol = Math.round((b.x - a.x) / G.colW);
  if (a.y === b.y) {
    if (Math.abs(dcol) === 1) return `M${a.x + HW} ${a.y} H${b.x - HW - 3}`;
    return `M${a.x + 10} ${a.y - HH} Q${(a.x + b.x) / 2} ${a.y - HH - 25 * dcol} ${b.x - 10} ${b.y - HH - 3}`;
  }
  const down = b.y > a.y;
  if (dcol === 0) return down ? `M${a.x} ${a.y + HH} V${b.y - HH - 3}` : `M${a.x} ${a.y - HH} V${b.y + HH + 3}`;
  if (Math.abs(dcol) === 1) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const [x1, y1] = clip(a.x, a.y, dx, dy, 0);
    const [x2, y2] = clip(b.x, b.y, -dx, -dy, 3);
    return `M${x1} ${y1} L${x2} ${y2}`;
  }
  return down
    ? `M${a.x + 24} ${a.y + HH} V${LANE_DOWN} H${b.x + 24} V${b.y - HH - 3}`
    : `M${a.x - 24} ${a.y - HH} V${LANE_UP} H${b.x - 24} V${b.y + HH + 3}`;
}

export default function StateMachineExplorer() {
  const reduced = useReducedMotion();
  const [orderVariant, setOrderVariant] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [step, setStep] = useState(-1);
  const stepRef = useRef(-1);

  const states = orderVariant ? ORDER_STATES : CART_STATES;
  const path = orderVariant ? ORDER_HAPPY_PATH : CART_HAPPY_PATH;
  const width = orderVariant ? ORDER_WIDTH : CART_WIDTH;
  const byId = useMemo(() => new Map(states.map((s) => [s.id, s])), [states]);
  const sel = selected ? byId.get(selected) ?? null : null;

  const edges = useMemo(
    () => states.flatMap((a) => a.next.flatMap((n) => {
      const b = byId.get(n);
      return b ? [{ key: `${a.id}>${n}`, from: a.id, to: n, d: edgePath(a, b) }] : [];
    })),
    [states, byId],
  );

  const lit = useMemo(() => {
    const out = new Set<string>();
    if (!sel) return out;
    let idx = path.indexOf(sel.id);
    if (idx < 0) {
      const preds = states.filter((s) => s.next.includes(sel.id) && path.includes(s.id)).map((s) => path.indexOf(s.id));
      idx = preds.length ? Math.min(...preds) : -1;
    }
    const written = path.slice(0, idx + 1);
    for (const c of CHECKPOINTS) {
      if (c.writtenBy === null ? sel.kind === 'failure' : written.includes(c.writtenBy)) out.add(c.id);
    }
    return out;
  }, [sel, path, states]);

  const goTo = (id: string | null, fromPlay = false) => {
    if (!fromPlay) {
      setPlaying(false);
      const i = id ? path.indexOf(id) : -1;
      stepRef.current = i;
      setStep(i);
    }
    setSelected(id);
  };

  const advance = () => {
    const n = stepRef.current + 1;
    if (n >= path.length) { setPlaying(false); return; }
    stepRef.current = n;
    setStep(n);
    goTo(path[n], true);
    if (n === path.length - 1) setPlaying(false);
  };

  useEffect(() => {
    if (!playing || reduced) return;
    const t = setInterval(advance, 700);
    return () => clearInterval(t);
  }, [playing, reduced, orderVariant]);

  const onPlay = () => {
    if (stepRef.current >= path.length - 1) { stepRef.current = -1; setStep(-1); }
    if (reduced) { advance(); return; }
    if (playing) { setPlaying(false); return; }
    advance();
    setPlaying(true);
  };

  const reset = () => {
    setPlaying(false);
    stepRef.current = -1;
    setStep(-1);
    setSelected(null);
    setOrderVariant(false);
  };

  const toggleVariant = () => {
    setPlaying(false);
    stepRef.current = -1;
    setStep(-1);
    setSelected(null);
    setOrderVariant((v) => !v);
  };

  const isNext = (id: string) => !!sel && sel.next.includes(id);
  const dimNode = (id: string) => !!sel && id !== sel.id && !isNext(id);
  const playLabel = reduced
    ? `Step happy path (${Math.max(step + 1, 0)}/${path.length})`
    : playing ? '❚❚ Pause' : '▶ Play happy path';

  return (
    <div class="widget sme">
      <WidgetHeader title={orderVariant ? 'Order checkout · state machine' : 'Cart checkout · state machine'} onReset={reset} />

      <div class="wg-row sme-controls">
        <button type="button" class="w-btn" onClick={onPlay} aria-pressed={reduced ? undefined : playing}>
          {playLabel}
        </button>
        <button type="button" class="w-btn" onClick={toggleVariant} aria-pressed={orderVariant}>
          Order checkout (7 states)
        </button>
      </div>

      <div class="wg-scroll sme-graph">
        <svg viewBox={`0 0 ${width} ${G.height}`} role="group" aria-label="State graph. Each state is a button; select one to highlight its outgoing transitions." style={{ minWidth: orderVariant ? '420px' : '600px' }}>
          <defs>
            <marker id="sme-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" class="sme-head" />
            </marker>
            <marker id="sme-arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0 0 L10 5 L0 10 z" class="sme-head sme-head-on" />
            </marker>
          </defs>
          {edges.filter((e) => e.from !== selected).map((e) => (
            <path key={e.key} d={e.d} class={`sme-edge${sel ? ' sme-dim' : ''}`} marker-end="url(#sme-arrow)" />
          ))}
          {edges.filter((e) => e.from === selected).map((e) => (
            <path key={e.key} d={e.d} class="sme-edge sme-edge-on" marker-end="url(#sme-arrow-on)" />
          ))}
          {states.map((s) => {
            const cls = ['sme-node', `sme-${s.kind}`];
            if (s.id === selected) cls.push('sme-selected');
            else if (isNext(s.id)) cls.push('sme-next');
            if (dimNode(s.id)) cls.push('sme-dim');
            return (
              <g
                key={s.id}
                class={cls.join(' ')}
                role="button"
                tabIndex={0}
                aria-pressed={s.id === selected}
                aria-label={`${s.id} (${s.kind})`}
                onClick={() => goTo(s.id)}
                onKeyDown={(e: KeyboardEvent) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(s.id); }
                }}
              >
                <title>{`${s.id}: ${s.description}`}</title>
                <rect x={s.x - HW} y={s.y - HH} width={G.nodeW} height={G.nodeH} rx="8" />
                {s.kind === 'terminal' && <rect class="sme-inner" x={s.x - HW + 4} y={s.y - HH + 4} width={G.nodeW - 8} height={G.nodeH - 8} rx="5" />}
                <text x={s.x} y={s.y + 4} text-anchor="middle">{s.short}</text>
              </g>
            );
          })}
        </svg>
      </div>

      <ul class="wg-list wg-row sme-legend" aria-label="Legend">
        <li><span class="sme-key sme-key-start" aria-hidden="true" /> start</li>
        <li><span class="sme-key sme-key-happy" aria-hidden="true" /> happy path</li>
        <li><span class="sme-key sme-key-failure" aria-hidden="true" /> failure (dashed)</li>
        <li><span class="sme-key sme-key-terminal" aria-hidden="true" /> terminal (double)</li>
      </ul>

      <div class="sme-panels">
        <div class="wg-panel sme-detail" aria-live="polite">
          {sel ? (
            <>
              <div class="sme-name wg-mono">{sel.id}</div>
              <div class="sme-kind"><Status tone={KIND_TONE[sel.kind]} label={sel.kind} /></div>
              <p class="sme-desc">{sel.description}</p>
              <div class="wg-faint sme-sub">Next states</div>
              {sel.next.length ? (
                <ul class="wg-list sme-nextlist">
                  {sel.next.map((n) => (
                    <li key={n}>
                      <button type="button" class="w-btn sme-nextbtn" onClick={() => goTo(n)} aria-label={`Go to ${n}`}>
                        → {n}{n === sel.id ? ' (retry)' : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p class="wg-muted">None. {sel.kind === 'terminal' ? 'Terminal state.' : 'Flagged for follow-up.'}</p>
              )}
              <p class="visually-hidden">{`${lit.size} of ${CHECKPOINTS.length} snapshot checkpoints written.`}</p>
            </>
          ) : (
            <p class="wg-muted">Select a state (click, or Tab then Enter) to see its description and allowed transitions, or play the happy path.</p>
          )}
        </div>

        <div class="wg-panel">
          <div class="wg-faint sme-sub">Snapshot checkpoints</div>
          <ul class="wg-list sme-checks">
            {CHECKPOINTS.map((c) => {
              const on = lit.has(c.id);
              const fail = c.writtenBy === null;
              return (
                <li key={c.id} class={on ? (fail ? 's-danger' : 's-success') : 'wg-faint'}>
                  <span aria-hidden="true" class="sme-glyph">{on ? (fail ? '✕' : '✓') : '○'}</span>
                  {c.label}
                  <span class="visually-hidden">{on ? ' (written)' : ' (not written)'}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <details class="sme-all">
        <summary>All states as a list</summary>
        <ul class="sme-alllist">
          {states.map((s) => (
            <li key={s.id}>
              <span class="wg-mono">{s.id}</span> <span class="wg-faint">({s.kind})</span> — {s.description}.{' '}
              <span class="wg-muted">Next: {s.next.length ? s.next.join(', ') : 'none'}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
