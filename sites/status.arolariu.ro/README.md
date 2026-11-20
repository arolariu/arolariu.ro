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
```

The official `@sveltejs/adapter-static` writes strict prerendered pages/assets to `build/static`, including the source-owned SWA config and
static HTTP 404 page. There is no managed API, dummy Function or SvelteKit server runtime today.

CI includes an optional API build step: when an `api` folder exists, it restores that folder's npm lock with production dependencies and
runs its `build` script. A future API must own that manifest, lock and build, producing a complete `build/server` with compiled Node 22
Functions, `host.json`, a runtime manifest and production dependencies. Incomplete API folders fail the build. Add API-specific checks,
tests and a Dependabot owner with the real API. SvelteKit `+server.ts` routes are not deployed automatically.

The pipeline checks types and unit gates, builds the frontend and optional API explicitly in CI, then uploads those artifacts with both SWA
build skips enabled. It keeps the existing token, GitHub Environment and Free resource; there are no staging environments, deployment slots,
Azure login steps or extra resources. Deployment jobs are serialized. Browser-side status-data fetching remains unchanged.

Vite preview remains static-only; Azure routing/Function behavior must be checked after an authorized deployment.

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
