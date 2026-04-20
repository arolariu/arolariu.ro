# sites/status.arolariu.ro

Service status page for arolariu.ro — SvelteKit on Azure Static Web Apps (Free).

## Layout
- `src/routes/+page.svelte` — main status page (prerendered shell + client fetch)
- `src/lib/components/` — UI primitives (SummaryStats, FilterPills, ServiceRow, SubServiceRow, ServiceDetailPanel, LatencyChart, LatencySparkline, UptimeBar, SegmentTooltip, IncidentList, StatusBanner, RefreshButton, SkeletonRow)
- `src/lib/api/fetchStatusData.ts` — 3-layer cache + hard-reload detection
- `src/lib/aggregation/` — client-side slice/compute helpers (sliceWindow, computeUptime, summaryStats, formatDuration, deriveParentStatus)
- `src/lib/types/` — shared types + native type guards (no Zod)
- `scripts/probe.ts` — Node entry that polls all 4 services
- `scripts/parsers/` — per-service response parsers
- `scripts/aggregate.ts` — rebuilds fine/hourly/daily JSON from raw JSONL
- `scripts/detectIncidents.ts` — 2-consecutive-failure state machine
- `tests/e2e/` — Playwright specs with fixture-mocked network

## Dashboard anatomy
Top-to-bottom on the main route:
1. **Header** — title, "LOCAL MOCKS" badge when on localhost, refresh button
2. **StatusBanner** — overall derived status + "last probe" timestamp
3. **SummaryStats** strip — 4 cards: Overall uptime, Avg latency, Incidents (ongoing · resolved), MTTR; values tween on window change
4. **FilterPills** — 9 time-window chips (1d / 3d / 7d / 14d / 30d / 60d / 90d / 180d / 365d) as a `role=radiogroup` with roving tabindex
5. **Service table** — one `ServiceRow` per service with name · p50 sparkline · uptime bar · uptime% · avg latency; whole row is `role=button` and clicks toggle `ServiceDetailPanel` (one-at-a-time). The panel wraps the legacy sub-checks (`SubServiceRow`) plus a full `LatencyChart` (inline SVG p50 polyline + p99 envelope + grid + crosshair).
6. **IncidentList** — `role=radiogroup` chip strip (All + one chip per service in the incident set) followed by incidents grouped under `Intl.DateTimeFormat` month headers.
7. **Footer** — cron cadence + data-branch provenance.

## Keyboard shortcuts
Wired globally in `+page.svelte` `onMount`, short-circuits when focus is in an editable element or any modifier key is held.

| Keys | Action |
|---|---|
| `←` / `→` | Previous/next filter window (wrap-around) |
| `1`..`9` | Jump directly to `FILTER_WINDOWS[digit-1]` (1=1d, 9=365d) |
| `r` / `R` | Refresh all data (same as the ⟳ button) |
| `Esc` | Collapse any expanded service detail panel |

## Data flow
GH Actions cron (`*/30 * * * *`) runs `npm run probe:all` → appends raw JSONL + rebuilds aggregates + updates incidents → commits to `status-data` orphan branch. SWA fetches JSON via `raw.githubusercontent.com` at runtime.

## Local dev
- `npm run dev` — Vite dev server on :5174
- `npm run test` — Vitest
- `npm run test:e2e` — Playwright
- `npm run probe:all` — run probe pipeline locally (set `DATA_DIR` env; defaults to `./data`)

## Code conventions
- Svelte 5 runes (`$state`, `$derived`, `$effect`) — not legacy reactive syntax
- No Zod — native type guards in `src/lib/types/guards.ts`
- CSS custom properties only — no hard-coded hex values in components
- AAA test pattern, colocated `*.test.ts`
- Segments as `<button>` with `aria-label` for accessibility
