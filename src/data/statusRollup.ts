/**
 * Profile-update status roll-up (spec §12.5). Items in a section are
 * alternatives; sections are mandatory. Approved ≥ required satisfies.
 */
export type ImageDecision = 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type ValueDecision = ImageDecision | 'APPROVED_WITH_REPLACEMENT';

export type ItemStatus = 'REQUESTED' | 'UNDER_REVIEW' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type SectionStatus = 'AWAITING_SUBMISSION' | 'UNDER_REVIEW' | 'SATISFIED';
export type RequestStatus = 'AWAITING_SUBMISSION' | 'PARTIALLY_SUBMITTED' | 'UNDER_REVIEW' | 'COMPLETED';

export interface ImageItem { id: string; name: string | null; kind: 'images'; images: string[] }
export interface ValueItem { id: string; name: string | null; kind: 'value'; value: string; replacement: string }
export type Item = ImageItem | ValueItem;

export interface Section { id: string; items: Item[] }
export interface ProfileRequest { id: string; sections: Section[] }

/** Decisions keyed by image id (image items) or item id (value items). */
export type Decisions = Record<string, ValueDecision>;

export const SAMPLE_REQUEST: ProfileRequest = {
  id: 'REQ-1',
  sections: [
    { id: 'SHOP_PHOTOS', items: [{ id: 'shop-photos', name: null, kind: 'images', images: ['P1', 'P2'] }] },
    {
      id: 'BUSINESS_KYC',
      items: [
        { id: 'gstin', name: 'GSTIN', kind: 'images', images: ['G1'] },
        { id: 'trade-licence', name: 'TRADE_LICENCE', kind: 'images', images: [] },
      ],
    },
    {
      id: 'BUSINESS_ADDRESS',
      items: [{
        id: 'address', name: null, kind: 'value',
        value: '12, MG Road, Bengaluru', replacement: '12, M.G. Road, Bengaluru 560001',
      }],
    },
  ],
};

/** Every decision starts as SUBMITTED. */
export function initialDecisions(req: ProfileRequest = SAMPLE_REQUEST): Decisions {
  const d: Decisions = {};
  for (const s of req.sections) {
    for (const it of s.items) {
      if (it.kind === 'images') for (const img of it.images) d[img] = 'SUBMITTED';
      else d[it.id] = 'SUBMITTED';
    }
  }
  return d;
}

export function itemStatus(item: Item, d: Decisions): ItemStatus {
  if (item.kind === 'value') {
    const dec = d[item.id] ?? 'SUBMITTED';
    return dec === 'APPROVED_WITH_REPLACEMENT' ? 'APPROVED' : dec;
  }
  let approved = 0;
  let submitted = 0;
  for (const img of item.images) {
    const dec = d[img] ?? 'SUBMITTED';
    if (dec === 'APPROVED' || dec === 'APPROVED_WITH_REPLACEMENT') approved++;
    else if (dec === 'SUBMITTED') submitted++;
  }
  if (approved >= 1) return 'APPROVED';
  if (submitted > 0) return 'UNDER_REVIEW';
  return 'REQUESTED';
}

export function sectionStatus(items: ItemStatus[]): SectionStatus {
  if (items.filter((s) => s === 'APPROVED').length >= 1) return 'SATISFIED';
  if (items.some((s) => s === 'SUBMITTED' || s === 'UNDER_REVIEW')) return 'UNDER_REVIEW';
  return 'AWAITING_SUBMISSION';
}

export function requestStatus(sections: SectionStatus[]): RequestStatus {
  if (sections.every((s) => s === 'SATISFIED')) return 'COMPLETED';
  const review = sections.some((s) => s === 'UNDER_REVIEW');
  const awaiting = sections.some((s) => s === 'AWAITING_SUBMISSION');
  if (review && awaiting) return 'PARTIALLY_SUBMITTED';
  if (review) return 'UNDER_REVIEW';
  return 'AWAITING_SUBMISSION';
}

export interface Rollup {
  items: Record<string, ItemStatus>;
  sections: Record<string, SectionStatus>;
  request: RequestStatus;
}

/** Pure: recompute every item, section and request status from decisions. */
export function computeRollup(req: ProfileRequest, d: Decisions): Rollup {
  const items: Record<string, ItemStatus> = {};
  const sections: Record<string, SectionStatus> = {};
  for (const s of req.sections) {
    const st = s.items.map((it) => (items[it.id] = itemStatus(it, d)));
    sections[s.id] = sectionStatus(st);
  }
  return { items, sections, request: requestStatus(req.sections.map((s) => sections[s.id])) };
}
