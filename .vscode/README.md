# .vscode Configuration

This workspace's VS Code config is tuned for **Aspire-mode** development. F5 launches
the full stack via the `tooling/AppHost` project (.NET Aspire 13.x).

## Launch configs (Run and Debug, Ctrl+Shift+D)

| Config | What it does |
|---|---|
| 🚀 Full stack (Aspire) | F5 default. Runs `dotnet run --project tooling/AppHost`. Debugger attached. |
| 🚀 Full stack (no debug) | Same, no attach. Faster startup. |
| 🌐 Website only | Runs `npm run dev` in `sites/arolariu.ro`. Standalone. |
| 🔧 API only | Runs `dotnet run` on the API project. Standalone. |
| 🔗 Attach to running .NET process | Picker dialog for hot-attach. |

Plus retained custom configs for Edge browser debug, DocFX, and Python exp FastAPI debug.

## Tasks (Ctrl+Shift+P → "Run Task")

| Task | What it does |
|---|---|
| Selfhost: up | Brings up the legacy containerized stack (`infra/Local/selfhost-start.sh`) |
| Selfhost: down | Stops the legacy stack |
| Lint | `npm run lint` |
| Format | `npm run format` |
| Test (unit) | `npm run test:unit` |
| Generate | `npm run generate` |

Aspire mode (F5) does not need any `Infra: up` preLaunchTask — Aspire 13.x's AppHost
spawns its own infra containers (SQL, Cosmos emulator, Azurite, Redis, Traefik) natively
via `tooling/AppHost/Program.cs`.

## Recommended extensions

Reload window to be prompted; or run "Extensions: Show Recommended Extensions" from the
command palette. The list covers C#, Docker, Vitest, Playwright, Svelte, Python, YAML,
Bicep, Mermaid, GitHub Actions, and code-quality tools.

## See also

- [AGENTS.md](../AGENTS.md) — full operating contract for this repo
- [DEVELOPMENT.md](../DEVELOPMENT.md) — dev environment details
- [infra/Local/readme.md](../infra/Local/readme.md) — Aspire vs Selfhost modes
- [docs/superpowers/specs/](../docs/superpowers/specs/) — design docs (gitignored, local-only)
