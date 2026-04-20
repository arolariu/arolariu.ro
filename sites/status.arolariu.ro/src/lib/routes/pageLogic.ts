/**
 * Pure logic extracted from `src/routes/+page.svelte` for testability.
 * The route file is excluded from coverage (see vitest.config.ts), so
 * anything that can be pulled out into a plain module gets pulled out.
 *
 * Nothing in here may import Svelte runtime primitives — `$props`, `$state`,
 * `$derived`, or `onMount`. Keep functions pure and side-effect-free.
 */

import {
  BUCKET_SIZE_TO_MS,
  WINDOW_CONFIGS,
  type AggregateFile,
  type BucketSize,
  type FilterWindow,
  type ServiceId,
  type ServiceSeries,
} from "../types/status";

/** Display order for service rows on the status page. Drives `orderedServices`. */
export const SERVICE_DISPLAY_ORDER: readonly ServiceId[] = [
  "arolariu.ro",
  "api.arolariu.ro",
  "exp.arolariu.ro",
  "cv.arolariu.ro",
];

/**
 * Returns services sorted by the canonical display order. Unknown service
 * ids sort to the end (indexOf returns -1, which `-b.idx` handles naturally —
 * we instead push them after known ones explicitly).
 */
export function orderedServices(file: AggregateFile | null): readonly ServiceSeries[] {
  if (!file) return [];
  const orderIndex = (id: string): number => {
    const idx = SERVICE_DISPLAY_ORDER.indexOf(id as ServiceId);
    return idx === -1 ? SERVICE_DISPLAY_ORDER.length : idx;
  };
  return [...file.services].sort((a, b) => orderIndex(a.service) - orderIndex(b.service));
}

/**
 * Maps the bucketSize of a sliced aggregate to its duration in ms.
 * Falls back to the 30m default for a null/missing slice.
 */
export function bucketDurationMsFor(bucketSize: BucketSize | undefined): number {
  if (bucketSize === undefined) return BUCKET_SIZE_TO_MS["30m"];
  return BUCKET_SIZE_TO_MS[bucketSize];
}

/**
 * Whether the WeekdayUptimeChart should render for the given filter window.
 * True for windows covering at least 14 days of history; false for narrower
 * windows where the 7-day breakdown would just be two samples per bar.
 */
export function showWeekdayChart(windowFilter: FilterWindow): boolean {
  return WINDOW_CONFIGS[windowFilter].showWeekday;
}

// `shouldIgnoreKeydown` previously lived here. It moved to
// `keyboardShortcuts.ts` — its real use site — and the re-export below
// keeps existing call sites (tests, for now) compiling while we migrate.
export {shouldIgnoreKeydown} from "./keyboardShortcuts";
