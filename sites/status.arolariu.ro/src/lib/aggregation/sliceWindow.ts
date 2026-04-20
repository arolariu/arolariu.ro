import {WINDOW_CONFIGS, type AggregateFile, type Bucket, type FilterWindow} from "../types/status";

const MS_PER_DAY = 86_400_000;

function filterBuckets(buckets: readonly Bucket[], cutoffMs: number, nowMs: number): Bucket[] {
  return buckets.filter(b => {
    const t = Date.parse(b.t);
    return Number.isFinite(t) && t >= cutoffMs && t <= nowMs;
  });
}

export function sliceWindow(file: AggregateFile, window: FilterWindow): AggregateFile {
  const nowMs = Date.now();
  const cutoffMs = nowMs - WINDOW_CONFIGS[window].days * MS_PER_DAY;
  return {
    ...file,
    services: file.services.map(s => {
      const slicedBuckets = filterBuckets(s.buckets, cutoffMs, nowMs);
      const subSeries = s.subSeries
        ? Object.fromEntries(
            Object.entries(s.subSeries).map(([k, v]) => [k, filterBuckets(v, cutoffMs, nowMs)])
          )
        : undefined;
      return subSeries !== undefined
        ? {...s, buckets: slicedBuckets, subSeries}
        : {...s, buckets: slicedBuckets};
    }),
  };
}
