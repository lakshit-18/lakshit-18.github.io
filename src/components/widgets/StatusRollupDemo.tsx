import { useState, useMemo } from 'preact/hooks';
import {
  SAMPLE_REQUEST, computeRollup, initialDecisions,
  type Decisions, type ValueDecision, type Item,
} from '../../data/statusRollup';
import { WidgetHeader, Status, type Tone } from './shared';
import './StatusRollupDemo.css';

const TONE: Record<string, Tone> = {
  APPROVED: 'success', SATISFIED: 'success', COMPLETED: 'success',
  SUBMITTED: 'info', UNDER_REVIEW: 'info',
  PARTIALLY_SUBMITTED: 'warn',
  REJECTED: 'danger',
  REQUESTED: 'muted', AWAITING_SUBMISSION: 'muted',
};

const IMAGE_OPTS: { v: ValueDecision; label: string }[] = [
  { v: 'SUBMITTED', label: 'Submitted' },
  { v: 'APPROVED', label: 'Approved' },
  { v: 'REJECTED', label: 'Rejected' },
];
const VALUE_OPTS = [...IMAGE_OPTS, { v: 'APPROVED_WITH_REPLACEMENT' as ValueDecision, label: 'Approve with replacement' }];

function Toggle({ label, value, opts, onChange }: {
  label: string;
  value: ValueDecision;
  opts: { v: ValueDecision; label: string }[];
  onChange: (v: ValueDecision) => void;
}) {
  return (
    <div class="srd-toggle" role="group" aria-label={`${label} decision`}>
      {opts.map((o) => (
        <button key={o.v} type="button" class="w-btn srd-opt" aria-pressed={value === o.v} onClick={() => onChange(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function StatusRollupDemo() {
  const [dec, setDec] = useState<Decisions>(() => initialDecisions());
  const roll = useMemo(() => computeRollup(SAMPLE_REQUEST, dec), [dec]);
  const set = (k: string, v: ValueDecision) => setDec((d) => ({ ...d, [k]: v }));
  const reset = () => setDec(initialDecisions());

  const narration = `Request ${roll.request}. ` + SAMPLE_REQUEST.sections
    .map((s) => `${s.id} ${roll.sections[s.id]}${roll.sections[s.id] === 'SATISFIED' ? ', write-back on' : ''}`)
    .join('; ') + '.';

  const itemBody = (it: Item) => {
    if (it.kind === 'value') {
      const d = dec[it.id] ?? 'SUBMITTED';
      return (
        <div class="srd-row">
          <span class="srd-value">
            “{d === 'APPROVED_WITH_REPLACEMENT' ? it.replacement : it.value}”
            {d === 'APPROVED_WITH_REPLACEMENT' && <span class="wg-faint"> (replaced)</span>}
          </span>
          <Toggle label="Address value" value={d} opts={VALUE_OPTS} onChange={(v) => set(it.id, v)} />
        </div>
      );
    }
    if (!it.images.length) return <p class="wg-faint srd-row">No images submitted.</p>;
    return it.images.map((img) => (
      <div key={img} class="srd-row">
        <span class="wg-mono srd-img" aria-hidden="true">▣ {img}</span>
        <Toggle label={`Image ${img}`} value={dec[img] ?? 'SUBMITTED'} opts={IMAGE_OPTS} onChange={(v) => set(img, v)} />
      </div>
    ));
  };

  return (
    <div class="widget srd">
      <WidgetHeader title="Profile update · status roll-up" onReset={reset} />

      <div class="wg-row srd-request">
        <span class="wg-muted">Request <span class="wg-mono">{SAMPLE_REQUEST.id}</span></span>
        <Status tone={TONE[roll.request]} label={roll.request} />
      </div>

      <div class="srd-sections">
        {SAMPLE_REQUEST.sections.map((s) => {
          const ss = roll.sections[s.id];
          const wb = ss === 'SATISFIED';
          return (
            <section key={s.id} class="wg-panel srd-section" aria-label={`Section ${s.id}`}>
              <div class="srd-shead">
                <span class="wg-mono srd-sname">{s.id}</span>
                <Status tone={TONE[ss]} label={ss} />
                <span class={`srd-wb ${wb ? 's-success' : 'wg-faint'}`}>
                  <span aria-hidden="true">{wb ? '●' : '○'}</span> Write-back {wb ? 'on' : 'off'}
                </span>
              </div>
              {s.items.map((it) => (
                <div key={it.id} class="srd-item">
                  <div class="srd-ihead">
                    <span class="wg-mono">{it.name ?? (it.kind === 'value' ? 'VALUE' : 'item')}</span>
                    <Status tone={TONE[roll.items[it.id]]} label={roll.items[it.id]} />
                  </div>
                  {itemBody(it)}
                </div>
              ))}
            </section>
          );
        })}
      </div>

      <p class="visually-hidden" aria-live="polite">{narration}</p>

      <ul class="wg-list srd-rules">
        <li>Items in a section are alternatives; sections are mandatory</li>
        <li>Approved ≥ required satisfies</li>
      </ul>
    </div>
  );
}
