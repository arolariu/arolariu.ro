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

The repository uses six owning asset types. Instruction catalogs are
subordinate resources, and MCP is security-sensitive client/tool
configuration rather than a guidance owner. Each concern should map to one
owner:

| If the concern is... | Put it in... | Not in... |
| --- | --- | --- |
| A path-scoped, always-enforced invariant (nullable rules, `applyTo` scope) | An `.instructions.md` file | An agent's prose or a skill step |
| Domain judgment/routing across many possible tasks | An agent (`.github/agents/*.agent.md`) | A prompt (prompts must stay thin) |
| A repeatable, ordered procedure with decision points | A skill (`.github/skills/*/SKILL.md`) | An agent (agents route, they don't enumerate steps) |
| A short local alias to an existing skill | A prompt (`.github/prompts/*.prompt.md`) | A new skill (do not fork the procedure) |
| Extensive examples/anti-patterns/edge cases for one path family | The owning instruction's linked catalog (`references/*.md`) | A separate owner or the auto-loaded instruction body |
| A deterministic optional local capability (read-only inventory, bounded context injection) | An extension (`.github/extensions/*/extension.mjs`) | An instruction (instructions cannot execute code) |
| Durable actionable context not derivable from tracked source | Memory | An instruction, catalog, or copied source snapshot |
| External tools/services exposed to Copilot | MCP client configuration | An agent/skill as though it owned the integration |

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

Every surface's frontmatter is minimal and functional. The shapes below are
repository requirements. The checker currently verifies descriptions,
forbidden model/calendar metadata, the exact global `applyTo: "**"` token,
and skill-directory name alignment; it does not validate equivalent broad
glob patterns or every required key/type, so reviewers must still inspect the
complete frontmatter.

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
name: code-unit-test
description: Add or improve focused tests for already-correct behavior across the repository stacks; route production defects to code-fix-bug.
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
.github/skills/code-unit-test/SKILL.md   name: "Unit Testing Skill"   ❌ mismatch
.github/skills/code-unit-test/SKILL.md   name: code-unit-test         ✅ matches
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
- Global and repository-owned scripts live only in root `AGENTS.md`'s Commands
  section; local guides point there and retain only commands that are
  genuinely local to a subproject.
- The RFC map (0001, 1001-1008, 2001-2004) lives only in root `AGENTS.md`.
  Instructions reference an RFC number (`agent-governance.instructions.md`
  references RFC via the operating protocol) instead of restating its
  content.
- Repository-wide risk boundaries live only in root `AGENTS.md`.
  `.github/copilot-instructions.md` and the operating protocol point there;
  agents and instructions add only role/path-specific triggers.
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
`code-unit-test` skill's Resource Triggers table is the reference shape: every
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

Every registered repository extension is read-only or adds bounded,
deterministic context. None call an LLM, execute shell commands, or make
permission decisions:

- `arolariu-checker` exposes inventory and doctor tools
  (`arolariu_ai_inventory`, `arolariu_ai_doctor`), each wrapped in
  `success()`/`failure()` and backed by pure filesystem reads.
  `diagnoseAssets` never edits a file. Validation command selection remains
  with the canonical guides and task skills rather than a duplicated extension
  profile.
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
- CODEOWNERS requests review for every agentic path (`.github/instructions/**`,
  `.github/agents/**`, `.github/skills/**`, `.github/prompts/**`,
  `.github/extensions/**`, `.github/agent-governance/**`,
  `.github/memory/**`, `.github/mcp.json`, `AGENTS.md`, `CLAUDE.md`,
  `.github/copilot-instructions.md`) at PR time. Whether approval is required
  or direct/forced updates are blocked depends on live branch rules and
  rulesets; query GitHub rather than freezing that state in guidance.
- MCP package supply chain: the current stdio entries use `npx -y` package
  resolution without repository-pinned versions. The threat model records
  this as an accepted risk, not a recommended pattern. Adding, replacing, or
  pinning an MCP package is both an MCP-configuration and dependency decision:
  stop for explicit approval, inspect the package's official release/source,
  define rollback, and do not silently "fix" the accepted baseline while
  editing unrelated AI guidance.
- GitHub MCP: the workspace configuration intentionally omits a second local
  GitHub server because Copilot CLI already provides its built-in GitHub
  integration. Adding a credential-bearing workspace duplicate requires
  explicit approval, a least-privilege token review, and evidence that the
  built-in surface lacks a required capability.

### Anti-pattern: an extension that executes arbitrary shell commands

`diagnostics.mjs` scans each registered `extension.mjs` entrypoint for this
and reports `"arbitrary-shell-handler"` (high severity) on a direct match. It
does not recursively scan imported helper modules, so source review must also
follow every local import:

```js
// ❌ Anti-pattern (would be flagged by arolariu_ai_doctor)
import {exec} from "node:child_process";
handler: async ({command}) => exec(command);
```

```js
// ✅ Correction: arolariu-checker's handlers only call pure, read-only
// inventoryAssets/diagnoseAssets functions backed by node:fs reads.
```

### Anti-pattern: `approveAll` or silent unmatched-permission approval

```js
// ❌ Anti-pattern: repository extensions must not make allow decisions.
onPreToolUse: async () => ({permissionDecision: "allow"});
```

`diagnostics.mjs` detects the literal `approveAll` identifier, but it does not
prove that every possible allow-shaped hook is absent. Manual review must
reject `permissionDecision: "allow"`, equivalent computed values, and any
extension that claims to secure arbitrary shell text. Execution safety belongs
to native permissions, assisted approval, local/cloud sandboxing, and remote
branch rules.

## Memory policy

`.github/memory/memory.json` may remain empty when no durable fact exists that
cannot be derived from source. Read its current contents rather than copying a
snapshot into guidance. `diagnostics.mjs` catches dotted version strings,
selected build/test/install/push command forms, and numeric asset-count
phrases. That heuristic is intentionally incomplete: reviewers must reject
other source-derived values such as runtime floors, arbitrary Git/GitHub
commands, paths, and architecture snapshots even when the doctor is clean.

### Anti-pattern: a memory entity that snapshots discoverable facts

```json
// ❌ Anti-pattern (flagged: "source-derived-memory")
{
  "entities": [
    {
      "name": "repository-versions",
      "observations": ["Framework <version-from-source>", "run the current repository test command"]
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

Follow the [code-fix skill](../skills/code-fix-bug/SKILL.md) for this request:

${input:request:Describe the observed behavior, expected behavior, and reproduction}
```

The current prompt files each follow this one-line-delegation shape. Discover
the current set from `.github/prompts/` rather than copying its count into
guidance. If a prompt file accumulates
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
Follow the [code-fix skill](../skills/code-fix-bug/SKILL.md) for this request:
```

## Runtime health evidence

A file existing under `.github/extensions/*/extension.mjs` is not proof the
extension loaded or is doing anything at runtime — the operating protocol's
"Do not treat an asset file as proof that a surface loaded it" applies
directly here. Each repository extension logs a session message specifically
so runtime health is independently checkable:

```js
// .github/extensions/arolariu-checker/extension.mjs
await session.log("arolariu-checker: read-only AI diagnostics enabled");

// .github/extensions/arolariu-context/extension.mjs
await session.log("arolariu-context: live path-based context enabled");
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
❌ "arolariu-context/extension.mjs exists in .github/extensions, so context
injection is active."
```

```text
✅ "arolariu-context logged 'live path-based context enabled' at session
start, and its resolver tests pass locally" — both runtime and logic evidence,
not just a file listing.
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
- `.github/memory/memory.json` — current memory state and schema.
- `.github/extensions/arolariu-checker/{extension,diagnostics,frontmatter,inventory}.mjs`
  — read-only inventory and doctor tools.
- `.github/extensions/arolariu-context/{extension,resolver}.mjs` — bounded
  deterministic context injection.
- `.github/skills/code-unit-test/SKILL.md` — canonical Resource Triggers table
  shape.
- `.github/prompts/fix-bug.prompt.md` — canonical thin-prompt shape.
- `.github/agents/backend-expert.agent.md` — canonical agent frontmatter
  shape.
