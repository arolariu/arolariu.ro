# .vscode Configuration

This workspace's VS Code config is tuned for **Aspire-mode** development. F5 launches the full stack via the `tooling/src/AppHost` project
(.NET Aspire 13.x).

## Launch configs (Run and Debug, Ctrl+Shift+D)

| Config                                      | What it does                                                                                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 🚀 Full stack (Aspire)                      | F5 default. Launches `tooling/src/AppHost` through the Aspire extension; debuggers attach to AppHost, .NET, Node, and Python resources. |
| 🚀 [Podman] / [Rancher] Full stack (Aspire) | Same, with the container runtime pinned via `ASPIRE_CONTAINER_RUNTIME` (`podman` / `docker`).                                           |
| 🚀 Full stack (no debug)                    | Same AppHost launch without debuggers. Also available as [Podman] / [Rancher] variants.                                                 |
| 🪡 Attach to Next.js (Aspire)               | Attaches to the website's Node.js inspector on port 9229.                                                                               |
| 🌐 Website only (standalone)                | Runs `npm run dev` in `sites/arolariu.ro`. Standalone.                                                                                  |
| 🔧 API only (standalone)                    | Launches `sites/api.arolariu.ro/src/Core/arolariu.Backend.Core.csproj` with the C# Dev Kit debugger. Standalone.                        |
| 🔗 Attach to running .NET process           | Picker dialog for hot-attach.                                                                                                           |

Plus retained custom configs for Edge browser debug, DocFX, and Python exp FastAPI debug.

## Tasks (Ctrl+Shift+P → "Run Task")

| Task                  | What it does                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------- |
| Selfhost: up          | Brings up the container-parity selfhost stack (`infra/Local/selfhost-start.sh`)              |
| Selfhost: down        | Stops the selfhost stack (`infra/Local/selfhost-stop.sh`)                                    |
| Aspire: run [Podman]  | `npm run dev:aspire:podman` (no debugger)                                                    |
| Aspire: run [Rancher] | `npm run dev:aspire:rancher` (no debugger)                                                   |
| Lint                  | `npm run lint`                                                                               |
| Format                | `npm run format`                                                                             |
| Test (unit)           | `npm run test:unit`                                                                          |
| Generate              | `npm run generate` (no tasks selected → no-op; use `npm run generate -- artifacts gql i18n`) |
| build                 | `dotnet build arolariu.slnx`                                                                 |
| publish               | `dotnet publish arolariu.slnx`                                                               |
| watch                 | `dotnet watch run --project tooling/src/AppHost/AppHost.csproj`                              |

Aspire mode (F5) does not need any `Infra: up` preLaunchTask — Aspire 13.x's AppHost spawns its own infra containers (SQL Server, Cosmos
vNext emulator, Azurite, Redis) natively via `tooling/src/AppHost/Program.cs`. The Aspire dashboard opens at `https://localhost:17080`.

## Recommended extensions

Reload window to be prompted; or run "Extensions: Show Recommended Extensions" from the command palette. The list covers Aspire (required
for the 🚀 configurations), C#, Docker, Vitest, Playwright, Svelte, Python, YAML, Bicep, Mermaid, GitHub Actions, and code-quality tools.

## See also

- [AGENTS.md](../AGENTS.md) — full operating contract for this repo
- [DEVELOPMENT.md](../DEVELOPMENT.md) — dev environment details
- [infra/Local/readme.md](../infra/Local/readme.md) — Aspire vs Selfhost modes
- [docs/rfc/](../docs/rfc/) — architecture decision records
