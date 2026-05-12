# Visual Studio 2026 Configuration

This solution's VS 2026 setup is tuned for **Aspire-mode** full-stack development.

## F5 starts everything

Open `arolariu.slnx`. AppHost (under `tooling/`) is set as the startup project.
F5 launches:

1. Aspire 13.x's native infrastructure containers (SQL Server, Cosmos vNext emulator,
   Azurite, Redis, Traefik) via `tooling/AppHost/Program.cs`
2. Native processes: exp (Python uvicorn), API (.NET), Website (Next.js),
   CV (SvelteKit), docs (Docusaurus), status (SvelteKit)
3. Traefik dynamic config wired for `*.localhost` HTTPS routes
4. Aspire dashboard at `https://dashboard.localhost`

Target time to "everything green": ~30s on a warm dev box.

## What VS 2026 handles natively

- .NET projects under `sites/api.arolariu.ro/` and `tooling/`
- Managed debugger auto-attached to API child process under AppHost
- Aspire dashboard surfaced in VS 2026's Aspire tool window
- `.github/agents/*.agent.md` available in Copilot Chat's agent picker
- MCP servers from `.copilot/mcp-config.json` available in Copilot Chat

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
- [../docs/superpowers/specs/](../docs/superpowers/specs/) — design docs (gitignored, local-only)
