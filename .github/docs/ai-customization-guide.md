# AI Customization Guide

This repository keeps Copilot guidance small, layered, and task-specific.
Live source remains authoritative for behavior.

## Supported Surfaces

First-class:

- GitHub Copilot CLI
- GitHub Copilot in Visual Studio Code
- GitHub Copilot coding agent

Best-effort:

- Clients that independently consume the root `CLAUDE.md` -> `AGENTS.md`
  alias

Client-specific configuration is not duplicated for non-first-class clients.

## Authority Model

| Layer | Source | Responsibility |
| --- | --- | --- |
| Live behavior | Code and configuration | Current implementation |
| Canonical repository contract | `AGENTS.md` | Versions, commands, architecture, safety, testing, Git |
| Universal Copilot contract | `.github/copilot-instructions.md` | Autonomy, context, editing, verification, failure behavior |
| Local context | Subproject `AGENTS.md` | Project-only paths, commands, architecture, exceptions |
| File constraints | `.github/instructions/*.instructions.md` | Language and domain rules selected by path |
| Task adapters | Agents, skills, prompts | Role routing and repeatable workflows |
| Learned context | Memory | Durable facts not derivable from source |

Accepted RFCs describe intent. Live code and configuration describe current
behavior. Material drift is reported rather than hidden.

## Choosing an Agent, Skill, or Prompt

| Need | Use |
| --- | --- |
| Repository-wide or path coding constraints | Instructions |
| A domain-owned implementation or read-only review role | Agent |
| A repeatable task workflow | Skill |
| A short local VS Code slash command | Prompt |
| Optional CLI runtime assistance | Extension |
| Durable, non-source-derived learned context | Memory |

Use the default agent for bounded work when no specialist ownership is needed.
Do not author the same workflow in an agent, skill, and prompt.

## Instructions

Path instructions and their ownership are documented in
[`instructions/README.md`](../instructions/README.md). They contain only rules
unique to matching files and inherit the root contracts.

## Agents

| Agent | Responsibility |
| --- | --- |
| `backend-expert` | API implementation using DDD and The Standard |
| `frontend-expert` | Website implementation using Next.js, React, i18n, and accessibility contracts |
| `infra-expert` | Approved Azure Bicep/GitHub Actions work and local Aspire/selfhost operations |
| `code-reviewer` | Evidence-based read-only diff role and remedy routing |
| `full-stack-planner` | Read-only website/API implementation planning |

Agents inherit the active surface model unless a future task has a specific,
verified reason to pin one.

## Skills

Portable workflows in `.github/skills/`:

- `backend-vertical-slice`
- `react-server-component`
- `react-client-component`
- `react-client-hook`
- `react-server-action`
- `react-client-store`
- `react-internationalization`
- `react-auth`
- `react-compiler`
- `code-unit-test`
- `code-fix-bug`
- `code-refactor`
- `code-documentation`
- `code-review`
- `infra-dependency-update`
- `infra-selfhost`

Skills inspect current sibling source before prescribing structure. They work
across Copilot CLI, VS Code, and Copilot coding agent.

### Cross-language workflow map

The `code-*` skills own one language-neutral procedure and load exactly the
matching repository artifact after the project boundary is known:

| Task | Orchestrator | Conditional artifacts |
| --- | --- | --- |
| Add coverage for correct behavior | `code-unit-test` | TypeScript/React/Svelte/Node, .NET/MSTest, or Python/FastAPI/pytest |
| Reproduce and correct a defect | `code-fix-bug` | TypeScript debugging, .NET debugging, or Python debugging |
| Improve structure without behavior change | `code-refactor` | TypeScript refactors, .NET refactors, or Python refactors |
| Document an existing contract | `code-documentation` | JSDoc/TSDoc, C# XML documentation, or Python docstrings |
| Review an existing diff/range read-only | `code-review` | TypeScript/UI, .NET, Python, AI assets, or infrastructure/workflow review |
| Research or perform an approved package/runtime/action migration | `infra-dependency-update` | npm, NuGet, Python, or GitHub Actions dependency ownership |
| Operate a local development environment | `infra-selfhost` | Aspire, selfhost, standalone, or ad hoc image/Compose guidance |

Shared decision tables, checklists, and troubleshooting remain in the same
bundle but load only at their named decision or failure trigger.

The Code Reviewer agent owns its read-only tools and correction routing;
`code-review` owns target resolution, evidence thresholds, severity/confidence,
conditional stack checks, and the findings output contract.

### React workflow map

`react.instructions.md` owns common semantics and artifact routing. Client and
server identity is derived from directives plus the import graph, so the
repository intentionally does not use path-only
`react.client.instructions.md`/`react.server.instructions.md` files.
Conditional `react-client.md` and `react-server.md` catalogs provide semantic
depth after that boundary is proven; `nextjs.md` separately owns App Router
framework behavior.

| Artifact | Skill |
| --- | --- |
| Interactive component or island | `react-client-component` |
| Page/layout, route boundary, server component, or server-compatible shared component | `react-server-component` |
| Custom Hook | `react-client-hook` |
| Browser-callable `"use server"` export | `react-server-action` |
| Approved Zustand/global state | `react-client-store` |
| Locale/message/selector schema | `react-internationalization` |
| Clerk/access-control behavior | `react-auth` |
| React Compiler audit or adoption | `react-compiler` |

## VS Code Prompt Shortcuts

Local prompt shortcuts in `.github/prompts/`:

- `api-endpoint`
- `react-server-component`
- `react-client-component`
- `react-client-hook`
- `react-server-action`
- `fix-bug`
- `unit-test`

Each shortcut collects input and delegates to one skill. Agent Host and cloud
tasks do not use prompt files; put portable workflow behavior in a skill.

## Copilot CLI Extensions

Project extensions are optional interactive CLI accelerators:

| Extension | Responsibility |
| --- | --- |
| `arolariu-context` | Adds bounded pointers to relevant live repository context |
| `arolariu-checker` | Exposes read-only inventory and diagnostics |

Static instructions remain complete when extensions fail. Native Copilot
permissions remain authoritative.

Extension source is not runtime health evidence. Inspect the loaded extension
and its log. Non-interactive `--prompt` mode can load zero project extensions,
so use an interactive CLI session for runtime checks.

## Native CLI Safety

The repository intentionally does not ship a shell-command policy extension.
Arbitrary shell text can dispatch scripts, aliases, interpreters, hooks, or
provider-specific path syntax, so a repository regex parser would create a
false security guarantee.

Use the native layers instead:

1. Keep the default permission flow for normal work. Do not use
   `--allow-all`/`--yolo` for routine repository sessions, and do not approve
   destructive commands or general-purpose runtimes for the rest of a
   session.
2. When experimental features are available, prefer
   `--experimental --assisted-approval` (or the assisted `/permissions`
   mode) so the built-in safety judge reviews permission requests rather than
   silently approving them.
3. Enable local command sandboxing with `/sandbox enable`, turn **Allow
   sandbox bypass** off, keep local MCP/LSP processes sandboxed, and inspect
   the effective result with `/sandbox policy`. Windows support requires a
   compatible Windows Insiders build.
4. Expose Git/`gh` credentials to the sandbox only for a task that genuinely
   needs authenticated GitHub operations.
5. Query live branch/ruleset settings before relying on review, lock,
   force-push, or deletion protection. Those controls are not stored in this
   repository.

Local sandboxing limits access outside the granted policy, but the current
working directory is read/write by default. It therefore contains blast
radius; it does not make an approved recursive deletion of the active
worktree harmless. Permission review, small commits, and remote branch rules
remain necessary.

The local sandbox also inherits most of the shell environment. Arbitrary
credentials already present there may remain visible, **Allow dev tool
access** can expose package-manager configuration/tokens, and outbound/local
network access is enabled by default. For hostile or untrusted code, prefer a
cloud sandbox or start from a secret-free environment, disable dev-tool
access, Git/`gh` authentication, outbound and local networking, and sandbox
bypass, then confirm the result with `/sandbox policy`.

For review-only sessions, keep shell commands on per-invocation approval.
Do not pre-approve even apparently read-only Git subcommands: `diff`, `log`,
and `show` accept output/external-tool options that can write or execute.
Never grant `shell(git:*)` to a reviewer; it also covers directly mutating
commands such as `clean`, `reset`, and `checkout`. Denial rules still take
precedence over allow rules, including `--allow-all-tools`.

## Memory

`.github/memory/memory.json` is reserved for durable, actionable context that
cannot be derived from tracked source. Do not store versions, commands, counts,
architecture snapshots, discoverable paths, task state, secrets, or personal
data.

Keep the committed file empty unless a durable non-source-derived fact is
actually approved. Do not prepopulate it with repository facts “for context”;
the live source and instructions already own those facts.

Copilot's server-side memory is separate from the tracked repository memory
policy/file. The workspace MCP configuration intentionally does not launch a
second memory server. Canonical source overrides memory.

## MCP

`.github/mcp.json` is the maintained workspace MCP configuration for Copilot.
Inspect that file for the current server set rather than copying the list into
documentation.

An MCP entry executes a package with the user's credentials. Adding,
replacing, or broadening a server requires explicit approval and CODEOWNERS
review.

The current Playwright workspace entry exposes all tools from its local
package. Treat it as code-capable rather than a read-only browser, keep native
permissions/sandboxing in force, and use an isolated environment for hostile
content. Pinning or narrowing that entry remains an approved MCP/dependency
decision.

## Event-Driven Maintenance

The change that invalidates guidance owns its update:

| Trigger | Update |
| --- | --- |
| Runtime/framework version | Root `AGENTS.md` version table |
| Build/test command | Root command contract and the invoking skill |
| Architecture/RFC | Owning RFC and affected path instruction |
| Copilot schema/capability | Affected agent, skill, prompt, or extension |
| Repeated agent mistake | Source pattern or one narrow owning rule |
| Extension failure | That extension and troubleshooting guidance |
| First-class surface change | This guide and that surface's adapter |

Do not add calendar review metadata or copy corrections across unrelated
assets.

## Adding or Changing Assets

1. Identify the single owning asset type.
2. Read `.github/agent-governance/operating-protocol.md`.
3. Use current product documentation for frontmatter or SDK changes.
4. Reference canonical facts instead of copying them.
5. Validate links, metadata, and runtime behavior where applicable.
6. Keep CODEOWNERS coverage for security-sensitive paths.

## Troubleshooting

| Problem | Action |
| --- | --- |
| Extension source exists but no tool/hook appears | Inspect extension runtime status and its process log |
| Extension reports `Hook processor is not configured` | Confirm the active CLI binary is current, fully exit stale host sessions, and retry in an interactive session |
| `copilot update` succeeds but `/restart` keeps the old binary | Check `copilot --version`; fully exit and relaunch the installed binary because supervised hosts can retain their bundled process |
| Checker tool unavailable in `--prompt` mode | Use interactive CLI; prompt mode does not expose project extensions |
| Skill does not load | Ensure directory name matches frontmatter `name` and the description states when to use it |
| Prompt does not run in cloud/Agent Host | Move workflow behavior to a skill; prompts are local VS Code shortcuts |
| Guidance conflicts with source | Follow source for current behavior and report RFC/guidance drift |
