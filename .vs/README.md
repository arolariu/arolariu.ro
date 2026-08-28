# Visual Studio 2026 Configuration

This solution's VS 2026 setup is tuned for **Aspire-mode** full-stack development.

## F5 starts everything

Open `arolariu.slnx`. AppHost (under `tooling/`) is set as the startup project.
F5 launches:

1. Aspire's native infrastructure containers (SQL Server, Cosmos vNext emulator,
   Azurite, Redis) via `tooling/AppHost/Program.cs`
2. Native processes: exp (Python uvicorn), API (.NET), Website (Next.js),
   CV (SvelteKit), docs (Docusaurus), status (SvelteKit)
3. Aspire dashboard at `https://localhost:17080`; services reachable directly at their
   native ports (api: 5000, website: 3000, exp: 5002, cv: 4173, docs: 3100, status: 3002)

## What VS 2026 handles natively

- .NET projects under `sites/api.arolariu.ro/` and `tooling/`
- Managed debugger auto-attached to API child process under AppHost
- Aspire dashboard surfaced in VS 2026's Aspire tool window
- `.github/agents/*.agent.md` available in Copilot Chat's agent picker
- `.github/mcp.json` is the repository-owned MCP configuration. Confirm server
  discovery in the active Visual Studio Copilot surface before relying on it;
  file presence alone is not runtime-health evidence.

## What VS 2026 handles "best-effort"

- JS/TS editing in the `.esproj`-backed frontend sites: works, but heavy
  refactoring is faster in VS Code
- Node debug attach for `npm run dev` processes: works via "Attach to Process"
- Python debug: works via Aspire's Python integration

## Tests

- .NET tests: visible in Test Explorer natively
- AppHost tests (`tooling/AppHost.Tests/`): same
- Vitest: run via integrated terminal (`npm run test:unit`) or VS Code's Vitest extension
- Playwright / Newman: CLI-only

## See also

- [../AGENTS.md](../AGENTS.md) — full operating contract
- [../DEVELOPMENT.md](../DEVELOPMENT.md) — dev environment details
- [../infra/Local/readme.md](../infra/Local/readme.md) — Aspire vs Selfhost modes
