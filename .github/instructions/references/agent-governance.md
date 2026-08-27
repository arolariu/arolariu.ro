# Agent Asset Governance Reference Catalog

Owner: `.github/instructions/agent-governance.instructions.md`. This catalog
holds extensive, repository-specific examples, anti-patterns, edge cases, and
rationale for AI customization under `.github/` (instructions, agents,
skills, prompts, extensions, memory, MCP configuration). It does not define a
workflow, and it does not restate the operating protocol
(`.github/agent-governance/operating-protocol.md`) or the threat model
(`.github/agent-governance/threat-model.md`) — both remain the sole owners of
evidence discipline, risk escalation, event-driven update ownership, and the
prompt-injection mitigation stack. This catalog only shows how those rules
play out in the repository's actual assets.

## Customization-type selection

Six customization surfaces exist, and each request should map to exactly
one, per the product boundaries this repository follows:

| If the concern is... | Put it in... | Not in... |
| --- | --- | --- |
| A path-scoped, always-enforced invariant (nullable rules, `applyTo` scope) | An `.instructions.md` file | An agent's prose or a skill step |
| Domain judgment/routing across many possible tasks | An agent (`.github/agents/*.agent.md`) | A prompt (prompts must stay thin) |
| A repeatable, ordered procedure with decision points | A skill (`.github/skills/*/SKILL.md`) | An agent (agents route, they don't enumerate steps) |
| A short local alias to an existing skill | A prompt (`.github/prompts/*.prompt.md`) | A new skill (do not fork the procedure) |
| Extensive examples/anti-patterns/edge cases for one path family | An instruction's linked catalog (`references/*.md`) | The auto-loaded instruction itself |
| A deterministic, optional capability (read-only inventory, permission classification) | An extension (`.github/extensions/*/extension.mjs`) or MCP server | An instruction (instructions can't execute code) |

[VS Code's agent customization concepts](https://code.visualstudio.com/docs/agents/concepts/customization),
[Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills),
[custom instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions),
and [GitHub custom agents](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
document this same separation and warn that a focused context window
consumes less of the model's budget than one that always loads everything —
this repository's split follows that guidance, not a repository-invented
convention.

### Edge case: a task that looks like it needs two surfaces at once

A request like "add a new bounded-context judgment rule and also change how
the backend vertical-slice skill orders its steps" is two separate asset
changes, not one. Route the judgment change to
`.github/agents/backend-expert.agent.md` and the procedure change to
`.github/skills/backend-vertical-slice/SKILL.md` — do not fold routing logic
into the skill or a step-by-step procedure into the agent.

## Frontmatter requirements by surface

Every surface's frontmatter is minimal and functional; the checker extension
(`diagnostics.mjs`) actively flags violations, so these shapes are enforced,
not aspirational.

**Instruction** (`name`, `description`, `applyTo`):

```yaml
---
name: Experimental Service Python
description: Python typing, FastAPI, Ruff, and pytest conventions for the experimental service.
applyTo: "sites/exp.arolariu.ro/**/*.py"
---
```

**Agent** (`name`, `description`, `tools`):

```yaml
---
name: Backend Expert
description: Implements and reviews arolariu.ro API changes using the repository DDD and The Standard contracts.
tools: ["read", "edit", "search", "execute", "agent"]
---
```

**Skill** (`name`, `description` — `name` must equal the containing directory
name):

```yaml
---
name: unit-test
description: Add or improve a focused unit test for behavior that is already correct, using current Vitest or MSTest conventions. Use for coverage, edge-case or regression guards, and test-quality work; route production defects to fix-bug.
---
```

**Prompt** (`name`, `description`, `argument-hint`, `agent`):

```yaml
---
name: fix-bug
description: Reproduce and fix a defect with a regression test.
argument-hint: "[failure or reproduction]"
agent: agent
---
```

### Anti-pattern: pinned model or calendar-review metadata

`diagnostics.mjs` explicitly rejects a `model:` key on an agent/prompt
(`"pinned-model"` finding — model selection must inherit the active
surface's default) and a `lastReviewed`/`lastUpdated` key on any asset
(`"last-reviewed"` finding — git history already records when an asset
changed):

```yaml
# ❌ Anti-pattern (flagged by arolariu_ai_doctor)
---
name: Backend Expert
model: "claude-opus-4"
lastReviewed: 2026-05-08
---
```

```yaml
# ✅ Correction: no model pin, no calendar metadata.
---
name: Backend Expert
description: Implements and reviews arolariu.ro API changes using the repository DDD and The Standard contracts.
tools: ["read", "edit", "search", "execute", "agent"]
---
```

### Anti-pattern: a skill name that doesn't match its directory

```text
.github/skills/unit-test/SKILL.md   name: "Unit Testing Skill"   ❌ mismatch
.github/skills/unit-test/SKILL.md   name: unit-test              ✅ matches
```

`diagnostics.mjs`'s `"skill-name-mismatch"` finding is `high` severity because
a mismatched name breaks discovery: the surface that loads skills by name
would fail to resolve the skill a prompt or agent references.

## One-owner examples

Every fact has exactly one asset that states it; every other asset points to
that owner instead of restating it:

- Versions (Node, .NET, Next.js, ...) live only in root `AGENTS.md`'s
  Versions table. `sites/exp.arolariu.ro/AGENTS.md` says "PEP 695 `type`
  keyword for aliases" but never repeats a Python version number — it
  implicitly matches whatever `requires-python` in `pyproject.toml` states.
- Global commands (`npm run test:unit`, `npm run build:website`, ...) live
  only in root `AGENTS.md`'s Commands section; local `AGENTS.md` files list
  only their own narrower commands (`sites/cv.arolariu.ro/AGENTS.md` lists
  `npm run build:cv`/`npm run dev:cv`, nothing global).
- The RFC map (0001, 1001-1008, 2001-2004) lives only in root `AGENTS.md`.
  Instructions reference an RFC number (`agent-governance.instructions.md`
  references RFC via the operating protocol) instead of restating its
  content.
- Risk escalation rules (dependency, auth, schema, infra, destructive) live
  only in `.github/agent-governance/operating-protocol.md`; every agent's
  Escalation section and every instruction's Escalation section names
  concrete repository triggers but does not re-derive the general policy.
- `python.instructions.md` and `svelte.instructions.md` each own their own
  path's non-negotiable rules and link exactly one catalog
  (`references/python.md`, `references/svelte.md`); neither restates the
  other's rules even though both services are "the smaller standalone
  sites" in the architecture.

### Anti-pattern: a pre-refactor instruction duplicating governance policy

Before this repository's agentic-governance consolidation, individual
instruction files each embedded their own copy of severity levels and
escalation policy:

```yaml
# ❌ Historical anti-pattern (superseded; see git history prior to the
# agentic-governance consolidation commits) — agent-governance.instructions.md
# used to define its own severity/escalation table:
```

```markdown
## Severity and Escalation

| Severity | Trigger | Action |
|----------|---------|--------|
| Critical | Security-sensitive or destructive-risk changes | Stop and require explicit user confirmation |
| High | Architecture/policy violations or unsupported success claims | Block completion until resolved |
```

```markdown
# ✅ Correction (current state): the instruction states its own scope and
# points to the one owning protocol document instead of re-deriving policy.

## Escalation

Stop for dependency, security, auth, schema, infrastructure, workflow,
destructive, or unresolved behavior decisions. Follow the operating protocol
for source/RFC drift and material uncertainty.
```

The same pattern applied to the pre-refactor `python.instructions.md` and
`svelte.instructions.md`, which each carried a `version`/`lastReviewed`
frontmatter pair and a "Quick Reference" table repeating Python/SvelteKit
version numbers already owned by root `AGENTS.md` — both are gone from the
current lean instructions for the same one-owner reason.

## Progressive disclosure

An optional resource is only useful if its trigger is concrete. The
`unit-test` skill's Resource Triggers table is the reference shape: every
row names an exact decision point, not a vague "read if useful":

```markdown
| Named trigger | Resource |
| --- | --- |
| Before selecting unit, component, integration, contract, or E2E coverage | [Test-type decision table](references/test-type-decision-table.md) |
| Only after a concrete runner, environment, timer, async, mock, browser API, discovery, assertion, or coverage failure | [Test troubleshooting](references/troubleshooting.md) |
```

```markdown
Do not open troubleshooting during a successful routine test task.
```

This repository's instruction-catalog pattern (introduced across
`typescript.instructions.md`, `csharp.instructions.md`,
`python.instructions.md`, `svelte.instructions.md`, and this instruction)
follows the same shape: the auto-loaded instruction names the exact
conditions ("a naming, tagging, or user-defined-type decision beyond the
rules above") that justify opening `references/<name>.md`, and states that
the catalog does not redefine the rules or escalation section above it.

### Anti-pattern: a trigger with no decision boundary

```markdown
<!-- ❌ Anti-pattern: gives the agent no way to decide when to stop reading. -->
See references/python.md for more details on Python.
```

```markdown
<!-- ✅ Correction, from python.instructions.md's Reference Catalog section:
     names the exact conditions that justify opening the catalog. -->
Open `references/python.md` only when the task needs a typing/FastAPI
boundary decision, a feature-flag storage-prefix question, a Ruff/pytest
edge case, or a configuration/error-handling decision beyond the rules
above.
```

## Extension and MCP threat boundaries

Every registered extension is either read-only or a deterministic
allow/deny/ask classifier — none call an LLM, and none silently approve a
permission request:

- `arolariu-checker` exposes exactly three tools
  (`arolariu_ai_inventory`, `arolariu_ai_doctor`,
  `arolariu_validation_context`), each wrapped in `success()`/`failure()`
  and backed by pure filesystem reads — `diagnoseAssets` never edits a file,
  and `resolveValidationContext` returns commands it verifies are already
  present in `AGENTS.md` rather than inventing or running them.
- `arolariu-guardrails` only implements `onPreToolUse`, and its
  `classifyToolCall` function returns `undefined` (no opinion, defer to
  native permissions) unless it detects a destructive shell pattern; when it
  does have an opinion, it only ever returns `"deny"` or `"ask"`, never an
  auto-approval:

```js
// .github/extensions/arolariu-guardrails/policy.mjs
if (mirrorMode) {
    return {
        permissionDecision: "deny",
        permissionDecisionReason:
            "Mirroring can force-update or delete main and preview and is prohibited.",
    };
}
...
return unresolvedForcedDestination
    ? {
            permissionDecision: "ask",
            permissionDecisionReason:
                "Forced push destination is implicit; explicit user confirmation is required.",
        }
    : undefined;
```

- `arolariu-context` only implements `onUserPromptSubmitted` and returns a
  bounded (`maxCharacters: 2000`), deterministically-derived
  `additionalContext` string built from existing file paths — it never
  fabricates a path and never grows unbounded:

```js
// .github/extensions/arolariu-context/extension.mjs
const additionalContext = buildContext({
    maxCharacters: 2000,
    prompt,
    repositoryRoot,
    workingDirectory,
});
return additionalContext ? {additionalContext} : undefined;
```

- MCP server scoping: `.github/mcp.json`'s `filesystem` entry passes an
  explicit allowlist (`sites/arolariu.ro/src`, `sites/api.arolariu.ro/src`,
  `packages/components/src`, `docs`, `infra/Azure/Bicep`) — it is a soft
  scope (CLI shell access is wider), so it narrows one structured tool, not
  a security boundary on its own. Note that this allowlist does not cover
  `sites/exp.arolariu.ro` or `sites/cv.arolariu.ro` — the two path families
  this catalog's siblings own — so filesystem-MCP reads there always fall
  back to the wider shell tools.
- CODEOWNERS gates every agentic path (`.github/instructions/**`,
  `.github/agents/**`, `.github/skills/**`, `.github/prompts/**`,
  `.github/extensions/**`, `.github/agent-governance/**`,
  `.github/memory/**`, `.github/mcp.json`, `AGENTS.md`, `CLAUDE.md`,
  `.github/copilot-instructions.md`) at PR time — it is a review gate, not a
  push-time block (this is a solo repo without branch protection, an
  accepted trade documented in the threat model).
- MCP package supply chain: the current stdio entries use `npx -y` package
  resolution without repository-pinned versions. The threat model records
  this as an accepted risk, not a recommended pattern. Adding, replacing, or
  pinning an MCP package is both an MCP-configuration and dependency decision:
  stop for explicit approval, inspect the package's official release/source,
  define rollback, and do not silently "fix" the accepted baseline while
  editing unrelated AI guidance.
- GitHub MCP credentials: `.github/mcp.json` receives
  `GITHUB_ACCESS_TOKEN` from the environment. Never commit, print, or copy the
  value into an agent asset. Before changing this entry, verify the credential
  is temporary and least-privilege for the intended tools; expanding scopes or
  replacing the authentication model requires explicit approval.

### Anti-pattern: an extension that executes arbitrary shell commands

`diagnostics.mjs` actively scans extension source for this and reports
`"arbitrary-shell-handler"` (high severity) on a match:

```js
// ❌ Anti-pattern (would be flagged by arolariu_ai_doctor)
import {exec} from "node:child_process";
handler: async ({command}) => exec(command);
```

```js
// ✅ Correction: arolariu-checker's handlers only call pure, read-only
// functions (inventoryAssets, diagnoseAssets, resolveValidationContext)
// backed by node:fs reads, never a shell.
```

### Anti-pattern: `approveAll` or silent unmatched-permission approval

```js
// ❌ Anti-pattern (would be flagged: "Extensions must not auto-approve
// permission requests.")
onPreToolUse: async () => ({permissionDecision: "allow"});
```

```js
// ✅ Correction: arolariu-guardrails returns undefined (defer to native
// permissions) for every tool call it has no specific opinion about, and
// only ever overrides toward "deny" or "ask".
```

## Memory policy

`.github/memory/memory.json` currently holds an empty entity/relation graph
(`{"entities": [], "relations": []}`) — this is the correct steady state
absent a durable fact that cannot be derived from source. `diagnostics.mjs`'s
`SOURCE_DERIVED_MEMORY` pattern actively flags any memory value that looks
like a version number, a `npm run`/`dotnet`/`python`/`git`/`gh` command, or a
count of agents/skills/prompts/instructions/extensions/stores/sites/
components/RFCs — because all of those are already derivable from tracked
source and would go stale silently.

### Anti-pattern: a memory entity that snapshots discoverable facts

```json
// ❌ Anti-pattern (flagged: "source-derived-memory")
{
  "entities": [
    {
      "name": "repository-versions",
      "observations": ["Next.js 16.3.0", "run npm run test:unit before committing"]
    }
  ]
}
```

```json
// ✅ Correction: memory only records context that live source cannot
// reconstruct (a rejected alternative, a user's standing preference not
// encoded anywhere else) — or it stays empty, as it is today.
{"entities": [], "relations": []}
```

## Prompt versus skill

Every prompt file is a thin, local alias — it names the skill, restates
nothing of the procedure, and forwards the user's input as a templated
variable:

```markdown
---
name: fix-bug
description: Reproduce and fix a defect with a regression test.
argument-hint: "[failure or reproduction]"
agent: agent
---

Follow the [bug-fix skill](../skills/fix-bug/SKILL.md) for this request:

${input:request:Describe the observed behavior, expected behavior, and reproduction}
```

The four prompts (`api-endpoint`, `new-page`, `fix-bug`, `unit-test`) each
follow this exact one-line-delegation shape. If a prompt file accumulates
its own numbered steps, decision points, or examples, that content belongs in
the skill it delegates to, not in the prompt.

### Anti-pattern: a prompt that forks its own procedure

```markdown
<!-- ❌ Anti-pattern: duplicates and drifts from the skill's real procedure. -->
1. Reproduce the bug.
2. Find the root cause.
3. Write a failing test.
4. Fix it.
5. Verify the test passes.
```

```markdown
<!-- ✅ Correction: delegate, as fix-bug.prompt.md does. -->
Follow the [bug-fix skill](../skills/fix-bug/SKILL.md) for this request:
```

## Runtime health evidence

A file existing under `.github/extensions/*/extension.mjs` is not proof the
extension loaded or is doing anything at runtime — the operating protocol's
"Do not treat an asset file as proof that a surface loaded it" applies
directly here. Each of this repository's three extensions logs a session
message specifically so runtime health is independently checkable:

```js
// .github/extensions/arolariu-checker/extension.mjs
await session.log("arolariu-checker: read-only AI diagnostics enabled");

// .github/extensions/arolariu-context/extension.mjs
await session.log("arolariu-context: live path-based context enabled");

// .github/extensions/arolariu-guardrails/extension.mjs
await session.log("arolariu-guardrails: destructive-operation checks enabled");
```

Verifying "the checker extension works" means confirming that log line
appeared in the current session's status/logs — not confirming
`extension.mjs` exists on disk. Separately, verifying the checker's *logic*
(not its runtime loading) means running its own Node test suite, which is
read-only and executes without any Copilot session:

```powershell
node --test .github/extensions/arolariu-checker/checker.test.mjs
```

### Anti-pattern: claiming an extension is healthy from source presence alone

```text
❌ "arolariu-guardrails/extension.mjs exists in .github/extensions, so
destructive-operation checks are active."
```

```text
✅ "arolariu-guardrails logged 'destructive-operation checks enabled' at
session start, and node --test .github/extensions/arolariu-guardrails/policy.test.mjs
passes 100% locally" — both runtime and logic evidence, not just a file
listing.
```

MCP discovery and runtime evidence are separate too. This read-only command
proves which workspace entries Copilot currently discovers:

```powershell
copilot mcp list --json
```

Require the expected servers to report `source: "workspace"` and
`sourcePath: ".github/mcp.json"` (or its absolute equivalent). Discovery does
not prove server health. When a task depends on one server, use an interactive
current CLI session to invoke one harmless read-only tool and inspect the
server/CLI log. Record a failure explicitly; do not add CI or claim health from
the JSON file alone.

## Live pointers

- `.github/agent-governance/operating-protocol.md`,
  `.github/agent-governance/threat-model.md` — the two documents this
  catalog does not duplicate.
- `.github/CODEOWNERS` — agentic-path review gate.
- `.github/mcp.json` — registered MCP servers and the `filesystem`
  allowlist.
- `.github/memory/memory.json` — current (empty) memory state.
- `.github/extensions/arolariu-checker/{extension,diagnostics,frontmatter,inventory,validation}.mjs`
  — read-only inventory/doctor/validation-context tools.
- `.github/extensions/arolariu-context/{extension,resolver}.mjs` — bounded
  deterministic context injection.
- `.github/extensions/arolariu-guardrails/{extension,policy}.mjs` —
  deny/ask-only destructive-operation classification.
- `.github/skills/unit-test/SKILL.md` — canonical Resource Triggers table
  shape.
- `.github/prompts/fix-bug.prompt.md` — canonical thin-prompt shape.
- `.github/agents/backend-expert.agent.md` — canonical agent frontmatter
  shape.
