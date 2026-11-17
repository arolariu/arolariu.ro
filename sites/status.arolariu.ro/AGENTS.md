# Status Site Local Guide

This file records status-site architecture, Svelte conventions, and exceptions. Root and the TypeScript path instruction own repository-wide
language, testing, safety, and Git rules; the CV-only Svelte instruction does not apply here.

## Layout

- `src/routes/+page.svelte` — main status page (prerendered shell + client fetch)
- Page styles live in an inline component-scoped `<style>` block at the end of `src/routes/+page.svelte`
- `src/lib/components/` — UI primitives, grouped into 5 focused subfolders:
  - `chrome/` — page-frame controls: `FilterChip` (primitive), `FilterPills`, `InfoButton`, `KeyboardHelpOverlay`, `LightModeToggle`,
    `Popover` (primitive), `RefreshButton`
  - `summary/` — hero summary strip: `SummaryStats` (4-column shell) + `OverallUptimeCard`, `AvgLatencyCard`, `IncidentsCard`, `MttrCard` +
    `StatusBanner`
  - `table/` — service-row table: `ServiceRow`, `SubServiceRow`, `SkeletonRow`, `UptimeBar`, `LatencySparkline`, `SegmentTooltip`,
    `ServiceDetailPanel`
  - `charts/` — embedded SVG charts: `LatencyChart`, `WeekdayUptimeChart`
  - `incidents/` — incident feed: `IncidentList` (shell) + `IncidentFilterChips`, `IncidentCard`, `IncidentDetail`
- `src/lib/hooks/` — runes-based hooks: `useCountTween.svelte.ts` (RAF-based number tween used by summary cards), `useMinuteTick.svelte.ts`
  (60 s reactive tick for relative-time labels), `usePopoverPosition.svelte.ts` (viewport-flip math for `SegmentTooltip`)
- `src/lib/stores/themeStore.svelte.ts` — light/dark/auto theme persistence used by `LightModeToggle`; `applyTheme` sets `<html data-theme>`
- `src/lib/api/fetchStatusData.ts` — 3-layer cache + hard-reload detection
- `src/lib/api/mockData.ts` — declarative per-service `ServiceStoryline` config + shared generator (dev/preview only)
- `src/lib/aggregation/` — client-side slice/compute helpers (sliceWindow, computeUptime, computeAvgLatency, summaryStats, weekdayUptime,
  worstUptime, weightedUptime, formatDuration, formatRelativeTime, deriveParentStatus, latencyTier)
- `src/lib/routes/` — logic pulled out of `+page.svelte`: `pageLogic.ts` (ordering, bucket-duration, weekday-chart gate),
  `keyboardShortcuts.ts` (`createKeyboardHandler(bindings)` + `shouldIgnoreKeydown`)
- `src/lib/types/` — shared types + native type guards (no Zod). Canonical per-window config is `WINDOW_CONFIGS` (days, granularity,
  showWeekday); `FILTER_WINDOWS = Object.keys(WINDOW_CONFIGS)`
- `src/app.css` — global tokens + utility classes (`.label-comment` for `//` copper prefix, `.heading-hash` for `#` copper prefix);
  `--status-table-grid` defines the shared table column track in one place
- `scripts/probe.ts` — Node entry that polls all 4 services. Each cron tick fires 2 discarded "warmup" HTTP GETs per service (30 s timeout,
  `(warmup)` User-Agent) before the existing 10-sample measurement batch (10 s timeout, 20 s spacing). Warmup results never reach
  `aggregateSamples` — they exist only to wake hibernating / scale-to-zero services so the measurement samples reflect steady-state latency.
  Knobs: `RunProbeOptions.warmupSampleCount` (count), module-private `WARMUP_FETCH_TIMEOUT_MS` (timeout).
- `scripts/parsers/` — per-service response parsers
- `scripts/rawProbes.ts` — shared raw JSONL reader used by `aggregate.ts` and `detectIncidents.ts`
- `scripts/sanitize.ts` — scrubs URLs and secret-bearing patterns from upstream health descriptions before they are published
- `scripts/aggregate*.ts` — raw JSONL → fine/hourly/daily JSON, split along service/sub-check boundary (`aggregate.ts` orchestrator,
  `aggregateCommon.ts` shared math, `aggregateServices.ts` + `aggregateSubChecks.ts` grouping)
- `scripts/detectIncidents*.ts` — 2-consecutive-failure state machine, split the same way (`detectIncidents.ts` orchestrator,
  `detectIncidentsCommon.ts` state machine, `detectIncidentsServices.ts` + `detectIncidentsSubChecks.ts` signal extraction)
- `tests/e2e/` — Playwright specs with fixture-mocked network

## Dashboard anatomy

Top-to-bottom on the main route:

1. **Header** — title, `[ local mocks ]` badge when on localhost, `LightModeToggle`, refresh button
2. **StatusBanner** (summary/) — overall derived status + "last probe" timestamp
3. **SummaryStats** (summary/) — 4-column shell composing `OverallUptimeCard`, `AvgLatencyCard`, `IncidentsCard`, `MttrCard`.
   `OverallUptimeCard`, `AvgLatencyCard` and `IncidentsCard` use `useCountTween`; `MttrCard` renders a humanized duration without a tween.
4. **FilterPills** (chrome/) — 9 time-window chips as a `role=radiogroup` with roving tabindex, using the `FilterChip` primitive with
   `variant="bracket"`
5. **Service table** (table/) — one `ServiceRow` per service with name · p50 sparkline · uptime bar · uptime% · avg latency; the name cell
   (`div.name-col`, `role="button"`, keyboard Enter/Space, `aria-expanded`) toggles `ServiceDetailPanel` (one-at-a-time). The panel wraps
   the sub-checks (`SubServiceRow`) plus a full `LatencyChart` (inline SVG fan chart: p50 centerline + p50↔p75 / p75↔p95 / p95↔p99 bands,
   falling back to a p50 line + p99 envelope when p75/p95 are missing; grid + crosshair + percentile card, from `charts/`).
6. **WeekdayUptimeChart** (charts/) — only rendered when `WINDOW_CONFIGS[w].showWeekday === true` (≥14d of history)
7. **IncidentList** (incidents/) — shell that composes `IncidentFilterChips` (using `FilterChip` with `variant="underline"`) + a
   month-grouped `IncidentCard` feed
8. **Footer** — cron cadence + data-branch provenance; `//` prefix via `.label-comment` utility

## Keyboard shortcuts

Wired via `createKeyboardHandler(bindings)` from `src/lib/routes/keyboardShortcuts.ts`, short-circuits when focus is in an editable element
or Ctrl/Meta/Alt is held (Shift is allowed so `?` and `R` work).

| Keys      | Action                                                                 |
| --------- | ---------------------------------------------------------------------- |
| `←` / `→` | Previous/next filter window (wrap-around)                              |
| `1`..`9`  | Jump directly to `FILTER_WINDOWS[digit-1]` (1=1d, 9=365d)              |
| `r` / `R` | Refresh all data (same as the ⟳ button)                                |
| `?`       | Toggle the keyboard-help overlay                                       |
| `Esc`     | Collapse any expanded service detail panel (or close the help overlay) |

## Data flow

`.github/workflows/official-status-probe.yml` owns the live twice-hourly schedule. Each run invokes `npm run probe:all`, appends raw JSONL,
rebuilds aggregates, updates incidents, and commits to the `status-data` orphan branch. SWA fetches JSON via `raw.githubusercontent.com` at
runtime.

## Local dev

- `npm run dev` — Vite dev server on :5174
- `npm run test` — Vitest
- `npm run test:e2e` — Playwright
- `npm run probe:all` — run probe pipeline locally (set `DATA_DIR` env; defaults to `./data`)

## Code conventions

- Svelte 5 runes (`$state`, `$derived`, `$effect`) — not legacy reactive syntax
- Custom hooks live in `src/lib/hooks/` with the `.svelte.ts` extension so runes compile
- Pure logic (plain `.ts`) in `src/lib/routes/` and `src/lib/aggregation/` — unit-testable without a component harness
- Shared primitives: `FilterChip` for chip rows (bracket | underline variants), `Popover` for floating surfaces (anchored popovers + modal
  dialogs). `SegmentTooltip` is deliberately NOT migrated to `Popover` — its viewport-flip math has too many edge cases to fit a generic
  contract; it uses `usePopoverPosition` instead.
- No Zod — native type guards in `src/lib/types/guards.ts`
- CSS custom properties only — no hard-coded hex values in components. `--status-table-grid` for the shared table track; `.label-comment` /
  `.heading-hash` utilities for repeated typographic patterns.
- AAA test pattern, colocated `*.test.ts` (or `*.svelte.test.ts` for hook tests that need runes)
- Segments as `<button>` with `aria-label` for accessibility
