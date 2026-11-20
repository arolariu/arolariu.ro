# status.arolariu.ro

Public service status page for arolariu.ro. Polls the health endpoints of the website, API and exp services (and the CV home page) every 30
min, stores 365 days of history in a dedicated `status-data` branch, renders a GitHub-style uptime table with hover tooltips and
auto-detected incidents.

- Live: https://status.arolariu.ro
- See `AGENTS.md` for development guidance and the full dashboard anatomy.

The dashboard layers a summary-stats strip (uptime / latency / incidents / MTTR), 9 time-window filter pills, a service table with a p50
sparkline column, click-to-expand service panels with an inline latency chart, and an incident list with per-service filter chips grouped by
month. Keyboard shortcuts: `← →` cycle windows, `1`..`9` jump directly, `r` refreshes, `?` toggles the shortcut help, `Esc` collapses.

Components live under `src/lib/components/{chrome,summary,table,charts,incidents}/` — see `AGENTS.md` for the folder-by-folder breakdown,
the `WINDOW_CONFIGS` single-source-of-truth, and the `FilterChip` / `Popover` shared primitives.

Deployed via GitHub Actions (`official-status-trigger.yml`) to Azure Static Web Apps Free tier. Data lives on the `status-data` orphan
branch and is served via `raw.githubusercontent.com` — the SWA prerenders the shell and fetches data at runtime.

## Build and deployment

From the repository root:

```bash
npm run build:status
npm run build:api --workspace=sites/status.arolariu.ro
```

The official `@sveltejs/adapter-static` writes strict prerendered pages/assets to `build/static`, including the source-owned SWA config and
static HTTP 404 page. The separate API build currently reports no API and removes only stale `build/server` output. There is no dummy
Function or SvelteKit server runtime.

For a future API, add a private `api/package.json` with `type: "module"`, `main: "functions/*.mjs"` and a declared `@azure/functions`
runtime dependency; generate its adjacent npm lock, add `api/host.json` version `2.0`, and register real HTTP Functions in
`api/src/functions/*.ts`. Keep dependency ownership separate from the root workspace. The shared builder restores production dependencies,
bundles Node 22 ESM entries, and produces a complete `build/server`. Partial/malformed API folders fail rather than silently deploying no
API. Add API-specific typechecks, tests, dependency-cache hashing and a Dependabot owner alongside the real API. SvelteKit `+server.ts`
routes are not deployed automatically.

The pipeline checks types, lint and unit gates, builds the frontend and optional API explicitly in CI, then uploads those artifacts with
both SWA build skips enabled. It keeps the existing token, GitHub Environment and Free resource; there are no staging environments,
deployment slots, Azure login steps or extra resources. Deployment jobs are serialized. Post-upload checks verify the commit marker,
HTML/assets and 404s before the success summary. Browser-side status-data fetching remains unchanged.

A seven-day `status-swa-<commit>-<attempt>` artifact retains the deployable pair (static-only today), commit/run marker and checksums.
Recovery requires explicit approval to re-upload a verified known-good artifact with matching configuration through the prebuilt path, not a
revert to the broken Oryx build. Previously successful runs inspected during migration had no retained artifacts, so no tested historical
bundle is assumed. Vite preview remains static-only; Azure routing/Function behavior must be checked after an authorized deployment.

## Testing

Run `npm run test:unit` (or `npm run test:coverage`) from this workspace. The `status-logic` project runs aggregation, guards, mock-data,
probe scripts, and attribution tests in Node without DOM setup. The `status-app` project runs the remaining tests in jsdom. Storage tests
use jsdom's real `localStorage` and intercept HTTP rather than replacing the data module. To check the dashboard in a browser locally, run
`npm run test:e2e -- status-page.spec.ts`.

The complete unit command requires 99% lines, functions, and statements, and 95% authored branches across Status runtime code, including
Svelte templates and probe scripts. The authored check retains uncertain branches and only omits compiler-generated decisions it can
identify from the same run's sources and transforms. Raw V8 reports remain in `code-cov/vitest` with a separate 90% branch floor. For a
scoped test run without coverage, use `npm run test:unit -- <selector> --coverage.enabled=false`. PR hygiene runs assertions with coverage
disabled; the Status deployment workflow runs the complete gate.
