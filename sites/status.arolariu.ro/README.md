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

## Testing

Run `npm run test:unit` from this workspace. The `status-logic` project runs pure aggregation and schema guards in Node without DOM setup.
The `status-app` project runs the remaining tests in jsdom, except scripts that opt into Node. Storage tests use jsdom's real `localStorage`
and intercept HTTP rather than replacing the data module. To check the dashboard in a browser locally, run
`npm run test:e2e -- status-page.spec.ts`.

The complete unit command requires 95% lines, functions, statements, and authored branches across Status runtime code, including Svelte
templates and probe scripts. The authored check retains uncertain branches and only omits compiler-generated decisions it can identify from
the same run's sources and transforms. Raw V8 reports remain in `code-cov/vitest` with a separate 90% branch floor. For a scoped test run
without coverage, use `npm run test:unit -- <selector> --coverage.enabled=false`.
