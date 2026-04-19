# sites/status.arolariu.ro

Service status page for arolariu.ro — SvelteKit on Azure Static Web Apps (Free).

## Layout
- `src/routes/+page.svelte` — main status page (prerendered shell + client fetch)
- `src/lib/components/` — UI primitives (UptimeBar, SegmentTooltip, ServiceRow, ...)
- `src/lib/api/fetchStatusData.ts` — 3-layer cache + hard-reload detection
- `src/lib/aggregation/` — client-side slice/compute helpers
- `src/lib/types/` — shared types + native type guards (no Zod)
- `scripts/probe.ts` — Node entry that polls all 4 services
- `scripts/parsers/` — per-service response parsers
- `scripts/aggregate.ts` — rebuilds fine/hourly/daily JSON from raw JSONL
- `scripts/detectIncidents.ts` — 2-consecutive-failure state machine
- `tests/e2e/` — Playwright specs with fixture-mocked network

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
