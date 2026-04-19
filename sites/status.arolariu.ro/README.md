# status.arolariu.ro

Public service status page for arolariu.ro. Polls `/health` endpoints of 4 services every 30 min, stores 365 days of history in a dedicated `status-data` branch, renders a GitHub-style uptime table with hover tooltips and auto-detected incidents.

- Live: https://status.arolariu.ro
- See `AGENTS.md` for development guidance.

Deployed via GitHub Actions (`official-status-trigger.yml`) to Azure Static Web Apps Free tier. Data lives on the `status-data` orphan branch and is served via `raw.githubusercontent.com` — the SWA prerenders the shell and fetches data at runtime.
