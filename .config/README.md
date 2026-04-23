# `.config/` — monorepo-wide tool manifests

This directory holds tool manifests that apply to the whole monorepo.
Currently just one:

## `dotnet-tools.json`

Pins the .NET CLI tools restored via `dotnet tool restore` on every
workspace / CI run. Today it pins a single entry:

| Tool | Why it's here |
|---|---|
| [`DefaultDocumentation.Console`](https://github.com/Doraku/DefaultDocumentation) | Used by the docs pipeline (`scripts/docs-assemble.ts → runDotnetInternals`) to turn the .NET XML doc comments of every `arolariu.Backend.*` project into markdown that Docusaurus can serve under `/internals/dotnet/`. |

Removing this file would break `npm run docs:assemble`: the `.NET`
internals extractor would have no tool to invoke and the build would
fail fast when `dotnet tool run DefaultDocumentation` returns
"command not found".

If you're working only on the frontend or on CI tasks that don't
build the docs site, you can skip `dotnet tool restore` locally — the
manifest is only consulted by the docs pipeline and by the
`official-docs-trigger.yml` workflow.
