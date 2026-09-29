/**
 * Cart-checkout state machine (spec §12.1). Positions are hard-coded for the
 * StateMachineExplorer SVG: happy path on the centre row (left → right),
 * failures on the row below, CHECKOUT_ABORTED at the far right bottom.
 */
export type StateKind = 'start' | 'happy' | 'failure' | 'terminal';

export interface StateDef {
  id: string;
  /** Compact label used inside the graph node. */
  short: string;
  kind: StateKind;
  description: string;
  next: string[];
  x: number;
  y: number;
}

export interface Checkpoint {
  id: string;
  label: string;
  /** State that writes this checkpoint; null = written by any failure state. */
  writtenBy: string | null;
}

/** Graph geometry shared with the component. */
export const SM_GEOMETRY = {
  colW: 140,
  x0: 70,
  nodeW: 124,
  nodeH: 44,
  rowHappy: 100,
  rowFail: 210,
  rowAbort: 300,
  height: 340,
} as const;

const col = (c: number) => SM_GEOMETRY.x0 + SM_GEOMETRY.colW * c;
const H = SM_GEOMETRY.rowHappy;
const F = SM_GEOMETRY.rowFail;
const A = SM_GEOMETRY.rowAbort;

export const CART_STATES: StateDef[] = [
  {
    id: 'CHECKOUT_INITIATED', short: 'INITIATED', kind: 'start', x: col(0), y: H,
    description: 'Cart validated, payment options computed',
    next: ['PAYMENT_SESSION_CREATED', 'PAYMENT_SESSION_CREATION_FAILED', 'ORDER_PLACEMENT_SUCCESSFUL', 'ORDER_PLACEMENT_FAILED', 'CHECKOUT_ABORTED'],
  },
  {
    id: 'PAYMENT_SESSION_CREATED', short: 'PS_CREATED', kind: 'happy', x: col(1), y: H,
    description: 'Payment session and gateway order created',
    next: ['PAYMENT_SESSION_SUCCESSFUL', 'PAYMENT_SESSION_COMPLETION_FAILED', 'PAYMENT_SESSION_CREATED', 'ORDER_PLACEMENT_SUCCESSFUL', 'CHECKOUT_ABORTED'],
  },
  {
    id: 'PAYMENT_SESSION_CREATION_FAILED', short: 'PS_CREATE_FAIL', kind: 'failure', x: col(1), y: F,
    description: 'Session could not be created; retryable',
    next: ['PAYMENT_SESSION_CREATED', 'PAYMENT_SESSION_CREATION_FAILED', 'CHECKOUT_ABORTED'],
  },
  {
    id: 'PAYMENT_SESSION_SUCCESSFUL', short: 'PS_SUCCESSFUL', kind: 'happy', x: col(2), y: H,
    description: 'Payment confirmed with the gateway',
    next: ['ORDER_PLACEMENT_SUCCESSFUL', 'ORDER_PLACEMENT_FAILED'],
  },
  {
    id: 'PAYMENT_SESSION_COMPLETION_FAILED', short: 'PS_COMPLETE_FAIL', kind: 'failure', x: col(2), y: F,
    description: 'Completion failed; retryable',
    next: ['PAYMENT_SESSION_SUCCESSFUL', 'PAYMENT_SESSION_COMPLETION_FAILED', 'CHECKOUT_ABORTED'],
  },
  {
    id: 'ORDER_PLACEMENT_SUCCESSFUL', short: 'ORDER_OK', kind: 'happy', x: col(3), y: H,
    description: 'Order created (idempotent on cart)',
    next: ['PENDING_PAYMENT_EXPECTATION_CREATED', 'PENDING_PAYMENT_EXPECTATION_CREATION_FAILED', 'CHECKOUT_COMPLETED'],
  },
  {
    id: 'ORDER_PLACEMENT_FAILED', short: 'ORDER_FAIL', kind: 'failure', x: col(3), y: F,
    description: 'Order creation failed; retry or re-pay',
    next: ['PAYMENT_SESSION_CREATED', 'ORDER_PLACEMENT_FAILED', 'ORDER_PLACEMENT_SUCCESSFUL', 'CHECKOUT_ABORTED'],
  },
  {
    id: 'PENDING_PAYMENT_EXPECTATION_CREATED', short: 'PPE_CREATED', kind: 'happy', x: col(4), y: H,
    description: 'Balance due at delivery recorded per order item',
    next: ['CHECKOUT_COMPLETED', 'PENDING_PAYMENT_EXPECTATION_CREATION_FAILED'],
  },
  {
    id: 'PENDING_PAYMENT_EXPECTATION_CREATION_FAILED', short: 'PPE_FAIL', kind: 'failure', x: col(4), y: F,
    description: 'Balance-due records failed; flagged for follow-up',
    next: [],
  },
  {
    id: 'CHECKOUT_COMPLETED', short: 'COMPLETED', kind: 'terminal', x: col(5), y: H,
    description: 'Done',
    next: [],
  },
  {
    id: 'CHECKOUT_ABORTED', short: 'ABORTED', kind: 'terminal', x: col(5), y: A,
    description: 'Abandoned or superseded by a newer checkout',
    next: [],
  },
];

export const CART_HAPPY_PATH = [
  'CHECKOUT_INITIATED',
  'PAYMENT_SESSION_CREATED',
  'PAYMENT_SESSION_SUCCESSFUL',
  'ORDER_PLACEMENT_SUCCESSFUL',
  'PENDING_PAYMENT_EXPECTATION_CREATED',
  'CHECKOUT_COMPLETED',
];

/** Graph width in SVG units for the cart variant (6 columns). */
export const CART_WIDTH = SM_GEOMETRY.colW * 6;

/* ---- Order-checkout variant (7 states) --------------------------------- */

const byId = (id: string): StateDef => {
  const s = CART_STATES.find((st) => st.id === id);
  if (!s) throw new Error(`unknown state ${id}`);
  return s;
};

const variant = (id: string, c: number, y: number, next: string[]): StateDef => ({ ...byId(id), x: col(c), y, next });

export const ORDER_STATES: StateDef[] = [
  variant('CHECKOUT_INITIATED', 0, H, ['PAYMENT_SESSION_CREATED', 'PAYMENT_SESSION_CREATION_FAILED', 'CHECKOUT_ABORTED']),
  variant('PAYMENT_SESSION_CREATED', 1, H, ['PAYMENT_SESSION_SUCCESSFUL', 'PAYMENT_SESSION_COMPLETION_FAILED', 'PAYMENT_SESSION_CREATED', 'CHECKOUT_ABORTED']),
  variant('PAYMENT_SESSION_CREATION_FAILED', 1, F, ['PAYMENT_SESSION_CREATED', 'PAYMENT_SESSION_CREATION_FAILED', 'CHECKOUT_ABORTED']),
  variant('PAYMENT_SESSION_SUCCESSFUL', 2, H, ['CHECKOUT_COMPLETED']),
  variant('PAYMENT_SESSION_COMPLETION_FAILED', 2, F, ['PAYMENT_SESSION_SUCCESSFUL', 'PAYMENT_SESSION_COMPLETION_FAILED', 'CHECKOUT_ABORTED']),
  variant('CHECKOUT_COMPLETED', 3, H, []),
  variant('CHECKOUT_ABORTED', 3, A, []),
];

export const ORDER_HAPPY_PATH = [
  'CHECKOUT_INITIATED',
  'PAYMENT_SESSION_CREATED',
  'PAYMENT_SESSION_SUCCESSFUL',
  'CHECKOUT_COMPLETED',
];

export const ORDER_WIDTH = SM_GEOMETRY.colW * 4;

/* ---- Snapshot checkpoints ---------------------------------------------- */

export const CHECKPOINTS: Checkpoint[] = [
  { id: 'cart', label: 'Cart details', writtenBy: 'CHECKOUT_INITIATED' },
  { id: 'order-payment', label: 'Order payment', writtenBy: 'CHECKOUT_INITIATED' },
  { id: 'payment-options', label: 'Payment options', writtenBy: 'CHECKOUT_INITIATED' },
  { id: 'payment-selection', label: 'Payment selection', writtenBy: 'CHECKOUT_INITIATED' },
  { id: 'session-init', label: 'Session initiation response', writtenBy: 'PAYMENT_SESSION_CREATED' },
  { id: 'session-complete', label: 'Session completion response', writtenBy: 'PAYMENT_SESSION_SUCCESSFUL' },
  { id: 'order-placement', label: 'Order placement response', writtenBy: 'ORDER_PLACEMENT_SUCCESSFUL' },
  { id: 'ppe', label: 'Post-advance payment expectations', writtenBy: 'PENDING_PAYMENT_EXPECTATION_CREATED' },
  { id: 'failure', label: 'Failure details', writtenBy: null },
];
