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
| `infra-expert` | Approved Azure Bicep and GitHub Actions work |
| `code-reviewer` | Evidence-based read-only diff review |
| `full-stack-planner` | Read-only website/API implementation planning |

Agents inherit the active surface model unless a future task has a specific,
verified reason to pin one.

## Skills

Portable workflows in `.github/skills/`:

- `backend-vertical-slice`
- `nextjs-page`
- `react-component`
- `zustand-store`
- `unit-test`
- `fix-bug`
- `dependency-migration`
- `documentation`
- `refactor`

Skills inspect current sibling source before prescribing structure. They work
across Copilot CLI, VS Code, and Copilot coding agent.

## VS Code Prompt Shortcuts

Local prompt shortcuts in `.github/prompts/`:

- `api-endpoint`
- `new-page`
- `fix-bug`
- `unit-test`

Each shortcut collects input and delegates to one skill. Agent Host and cloud
tasks do not use prompt files; put portable workflow behavior in a skill.

## Copilot CLI Extensions

Project extensions are optional interactive CLI accelerators:

| Extension | Responsibility |
| --- | --- |
| `arolariu-context` | Adds bounded pointers to relevant live repository context |
| `arolariu-guardrails` | Adds defense-in-depth for a narrow set of destructive operations |
| `arolariu-checker` | Exposes read-only inventory, diagnostics, and validation guidance |

Static instructions remain complete when extensions fail. Native Copilot
permissions remain authoritative.

Extension source is not runtime health evidence. Inspect the loaded extension
and its log. Non-interactive `--prompt` mode can load zero project extensions,
so use an interactive CLI session for runtime checks.

## Memory

`.github/memory/memory.json` is reserved for durable, actionable context that
cannot be derived from tracked source. Do not store versions, commands, counts,
architecture snapshots, discoverable paths, task state, secrets, or personal
data.

Copilot's server-side memory is separate from the file-based MCP memory store.
Canonical source overrides both.

## MCP

`.copilot/mcp-config.json` is the maintained project MCP configuration for
Copilot CLI. Inspect that file for the current server set rather than copying
the list into documentation.

An MCP entry executes a package with the user's credentials. Adding,
replacing, or broadening a server requires explicit approval and CODEOWNERS
review.

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
