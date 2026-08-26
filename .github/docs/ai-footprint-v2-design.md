# AI Footprint V2 Design

**Status:** Approved design
**Date:** 2026-08-26
**Implementation branch:** `refactor/ai-footprint-v2`
**Pull request base:** `preview`

## Summary

This design restructures the repository's AI customization layer to improve
quality-adjusted throughput: more correct work with less human correction,
prompting, and hand-holding.

The target architecture combines a thin, authoritative static core with three
optional Copilot CLI extensions:

1. `arolariu-guardrails` provides defense-in-depth for a small set of
   destructive or irreversible tool calls.
2. `arolariu-context` derives compact task context from live canonical files.
3. `arolariu-checker` provides read-only AI asset diagnostics and validation
   guidance.

The static core remains complete when every extension is unavailable. GitHub
Copilot CLI, GitHub Copilot in VS Code, and the GitHub Copilot coding agent are
the only first-class surfaces. Claude Code, Cursor, and Windsurf are not
first-class targets.

## Agent Asset Contract

### Scope

This design governs:

- root and subproject `AGENTS.md` files;
- `.github/copilot-instructions.md`;
- `.github/instructions/**`;
- `.github/agents/**`;
- `.github/skills/**`;
- `.github/prompts/**`;
- `.github/extensions/**`;
- `.github/agent-governance/**`;
- `.github/memory/**`;
- `.github/docs/ai-customization-guide.md`;
- Copilot and non-Copilot MCP/client configuration;
- read-only compatibility validation of
  `.github/workflows/copilot-setup-steps.yml`.

It does not change application architecture, product behavior, authentication,
data schemas, Azure infrastructure, or deployment workflows.

### Required Inputs

Implementation must use these sources as current evidence:

- `AGENTS.md`;
- `.github/copilot-instructions.md`;
- the applicable subproject `AGENTS.md` files;
- `.github/agent-governance/threat-model.md`;
- `package.json`;
- `sites/api.arolariu.ro/Directory.Build.props`;
- live sibling source and test files for every skill example or invariant;
- the installed Copilot CLI extension SDK documentation;
- current extension load diagnostics from `extensions_manage`.

### Execution Constraints

- Work from `refactor/ai-footprint-v2`, based on `preview`.
- Keep commits atomic and independently revertible.
- Open the final pull request against `preview`.
- Do not add a benchmark, evaluation harness, session telemetry, generated AI
  artifacts, or AI-specific CI validation.
- Do not create a worktree.
- Do not make extension behavior the sole source of safety or correctness.
- Do not add dependencies for extension implementation or tests.
- Do not preserve an asset merely to preserve the current asset count.
- Do not commit `docs/superpowers/**` or `.superpowers/**`.

### Validation

Validation is local and evidence-based:

- structural scans for duplicated volatile facts, invalid frontmatter, broken
  references, conflicting scopes, and stale commands;
- Node built-in tests for extension logic;
- isolated and combined extension load checks;
- representative discovery and invocation checks on Copilot CLI, VS Code, and
  the Copilot coding agent;
- `git --no-pager diff` and `git --no-pager status` before every commit and the
  final pull request.

### Escalation Conditions

Stop and ask before:

- adding a dependency;
- changing authentication, data schemas, infrastructure, deployment behavior,
  or production workflows;
- modifying any GitHub Actions workflow, including Copilot setup;
- weakening a security boundary;
- retaining a contradiction whose resolution would change application
  behavior;
- opening a pull request with an unresolved Copilot CLI runtime blocker.

## Goals

1. Eliminate stale and contradictory guidance that causes incorrect changes.
2. Reduce correction loops and broad ask-first interruptions.
3. Give every fact, rule, workflow, and runtime capability one clear owner.
4. Reduce irrelevant context loaded for ordinary tasks.
5. Preserve useful specialist routing and repeatable workflows.
6. Keep runtime extensions optional, narrow, observable, and failure-safe.
7. Make maintenance event-driven rather than calendar-driven.

## Non-Goals

- Measuring model quality with a benchmark or golden task suite.
- Capturing per-session latency, token, correction, or outcome telemetry.
- Generating Markdown assets from a schema.
- Adding AI asset validation to CI.
- Providing feature parity for Claude Code, Cursor, or Windsurf.
- Replacing repository tests, linters, compilers, or native Copilot
  permissions with extension regexes.
- Expanding the number of personas without a recurring workflow need.

## Current-State Findings

The 2026-08-26 inventory found:

| Finding | Evidence | Consequence |
| --- | --- | --- |
| Three CLI extensions are documented as active but all fail at startup | `.github/docs/ai-customization-guide.md`; `extensions_manage list/inspect` | Advertised context, guardrails, and tools provide no current value |
| The extension failure is common to all three | Runtime reports `Hook processor is not configured for session id` | Extension compatibility must be proven before behavioral rewrites |
| Volatile facts are copied into memory and extensions | `.github/memory/memory.json`; `.github/extensions/arolariu-context/extension.mjs` | Versions, counts, commands, stores, and architecture drift |
| Routine validation guidance conflicts | Root contract versus agents, skills, prompts, and instructions | Agents run expensive checks or choose the wrong scope |
| Test templates conflict with current conventions | `unit-test.prompt.md`, `zustand-store/SKILL.md`, `new-page.prompt.md` | Templates encourage internal-module mocks and legacy test directories |
| Review behavior is globally injected | `code-review.instructions.md` has `applyTo: '**'` | Review persona and severity rules pollute non-review tasks |
| Models and tool schemas are pinned in task assets | Agent and prompt frontmatter | Assets age with surface capabilities and may request unavailable tools |
| Governance prose is copied into most agents, prompts, and skills | Repeated RFC and self-audit sections | More context and more places for the same contract to diverge |
| The core Markdown corpus is oversized | About 42,000 words across instructions, agents, prompts, and skills | Relevant rules compete with tutorials, copied templates, and persona text |
| The customization guide overstates support | It claims multiple non-Copilot clients and always-active extensions | Users cannot trust the guide as an operational index |

These findings are implementation inputs, not a permanent performance
benchmark.

## Target Authority Model

Authority flows from stable sources to narrow adapters. Lower layers reference
higher layers instead of copying them.

| Layer | Owner | May Contain | Must Not Contain |
| --- | --- | --- | --- |
| 1. Live source | Code, configuration, package manifests | Current behavior and machine-readable values | Agent-specific prose |
| 2. Canonical repository contract | Root `AGENTS.md` | Versions, commands, architecture facts, repository-wide conventions | Surface-specific tool syntax |
| 3. Universal Copilot contract | `.github/copilot-instructions.md` | Risk-based autonomy, safety, precedence, editing and verification discipline | Domain tutorials or copied versions |
| 4. Local context deltas | Subproject `AGENTS.md` | Project-only architecture, paths, commands, exceptions | Root facts or generic language rules |
| 5. Path-specific constraints | `.github/instructions/*.instructions.md` | Rules activated by matching files | Personas, complete tutorials, copied governance blocks |
| 6. Task adapters | Agents, skills, prompts | Role routing or one repeatable workflow | Competing repository facts or duplicate workflows |
| 7. Learned context | Repository and Copilot memory | Durable, non-derivable exceptions with evidence | Versions, counts, commands, architecture summaries |

### Precedence

When guidance conflicts:

1. Runtime and security constraints win.
2. Live code and configuration define current behavior.
3. Root governance and `AGENTS.md` define canonical repository intent and
   facts.
4. Subproject `AGENTS.md` files add local facts.
5. Path instructions add file-specific constraints.
6. Agents, skills, and prompts adapt the preceding layers to a task.
7. Memory may add learned context but cannot override canonical sources.

An accepted RFC describes architectural intent. If an RFC and live source
conflict, the implementation follows source behavior where safe, identifies the
drift, and escalates only when choosing a side would change behavior.

## Asset Portfolio

### Agents

Retain five thin specialists:

1. Backend Expert
2. Frontend Expert
3. Infrastructure Expert
4. Code Reviewer
5. Full-Stack Planner

Convert Documentation Writer into a documentation skill.

Each retained agent contains only:

- role and owned domain;
- task types it accepts and rejects;
- minimum context it must inspect;
- decision and delegation strategy;
- tool boundary;
- risk escalation conditions;
- concise completion contract.

Remove:

- copied versions and commands;
- large code examples;
- generic governance and self-audit blocks;
- stale model pins;
- obsolete tool names;
- duplicated safety lists;
- theatrical persona text that reduces review precision.

The Code Reviewer remains read-only and evidence-first. Review-only behavior
moves out of globally applied instructions.

### Skills

Skills become the sole source of repeatable execution workflows.

| Target Skill | Consolidates |
| --- | --- |
| `backend-vertical-slice` | `ddd-service` skill and `api-endpoint` prompt |
| `nextjs-page` | `i18n-page` skill and `new-page` prompt |
| `react-component` | Existing React component workflow |
| `zustand-store` | Existing store skill and `extend-store` prompt |
| `unit-test` | Existing unit-test prompt |
| `fix-bug` | Existing bug-fix prompt |
| `dependency-migration` | `migration` and `upgrade-dependency` prompts |
| `documentation` | Documentation Writer and `comment-standard` prompt |
| `refactor` | Existing refactor prompt |

Skills must:

- inspect current sibling source and tests before prescribing structure;
- encode invariants and decision points, not complete implementation snapshots;
- use test-driven development where behavior changes;
- name only the smallest relevant validation profile;
- inherit universal governance instead of repeating it;
- stop at risk-based escalation boundaries.

### Prompts

Retain four thin human-invoked shortcuts:

1. `api-endpoint`
2. `new-page`
3. `fix-bug`
4. `unit-test`

Each prompt captures user arguments and delegates to exactly one skill. It does
not contain architecture rules, code templates, version numbers, validation
commands, safety policy, model selection, or tool schemas.

Dependency migration, documentation, store changes, and refactoring remain
discoverable through skill descriptions and natural-language requests.

### Instructions

Retire `code-review.instructions.md`. Its review rules move into the Code
Reviewer agent.

Keep the remaining path instructions but make their ownership orthogonal:

- TypeScript owns language and type-system rules.
- React owns React semantics and component behavior.
- Frontend owns Next.js and site architecture.
- C# owns language and async conventions.
- Backend owns API DDD and The Standard.
- Components owns shared component-library constraints.
- Bicep owns Azure Bicep conventions.
- Workflows owns GitHub Actions conventions.
- Python owns the experimental service's Python conventions.
- Svelte owns the CV site's Svelte conventions.
- Agent governance owns requirements unique to AI asset changes.

Remove from instruction files:

- repeated root rules;
- persona language;
- long tutorials and generic examples;
- repeated RFC/self-audit blocks;
- copied version values;
- `lastReviewed` dates.

Git history and event-driven updates replace calendar metadata.

### Governance Documents

Retain the threat model as a separate security artifact.

Merge RFC grounding and self-audit into one concise operating protocol that
defines:

- evidence expectations;
- source versus RFC conflict handling;
- risk escalation;
- material uncertainty disclosure;
- event-driven invalidation rules.

Task assets inherit this protocol through the shared instruction hierarchy.
They do not reproduce it.

### Memory

Reset `.github/memory/memory.json` by removing source-derived repository
snapshots.

Repository memory may contain only durable facts that are:

- not directly derivable from tracked source;
- actionable in future work;
- supported by citations;
- paired with a condition that would invalidate them.

Do not store:

- runtime or dependency versions;
- asset, component, store, site, or RFC counts;
- build or test commands;
- architecture summaries already in `AGENTS.md` or RFCs;
- file paths discoverable by search;
- transient task state.

### Documentation and Client Configuration

Rewrite `.github/docs/ai-customization-guide.md` as a truthful index:

- no hardcoded asset counts;
- no claim that extensions are always active;
- no claim of first-class Cursor, Windsurf, or Claude Code support;
- clear authority, routing, troubleshooting, and event-update guidance.

GitHub Copilot CLI, VS Code, and the Copilot coding agent are first-class.

Retire Claude-specific MCP/settings duplication:

- remove tracked `.mcp.json`;
- remove tracked `.claude/settings.json`;
- update CODEOWNERS and documentation accordingly.

Retain `CLAUDE.md` as a zero-maintenance symlink to `AGENTS.md` for best-effort
compatibility. Do not touch untracked `.claude/settings.local.json`.

Keep `.copilot/mcp-config.json` as the Copilot CLI MCP configuration. Review it
for least privilege, current package identifiers, and unnecessary overlap, but
do not add an MCP server without explicit approval.

## CLI Extension Architecture

All three extensions:

- use the installed SDK's supported `joinSession` lifecycle;
- are discoverable as independent extension directories;
- use globally unique tool names;
- never write to stdout;
- do not use `approveAll`;
- do not return an implicit `allow` decision for unmatched tool calls;
- never execute arbitrary user-supplied shell commands;
- return explicit failure results rather than success-shaped error strings;
- do not call another extension;
- log concise startup and failure information;
- remain optional to static-core behavior.

Pure helpers may be shared only when doing so does not create hidden
cross-extension state or lifecycle coupling. Guardrails command classification
must remain independently testable.

### `arolariu-guardrails`

`arolariu-guardrails` contains hooks and no custom tools.

It owns a deliberately small `onPreToolUse` policy for:

- recursive deletion aimed at a filesystem root, repository root, session root,
  or unresolved broad target;
- force-pushing `main` or `preview`;
- destructive database operations without an explicit approved task;
- similarly irreversible commands identified by the repository threat model.

For each matched operation it returns `deny` or `ask`, with a specific reason.
For unmatched operations it returns no permission decision so Copilot's native
permission system remains authoritative.

It normalizes real current tool names and structured arguments. It must account
for PowerShell and shell syntax without pretending regex matching is a complete
security boundary.

It does not:

- detect `any`, inline styles, documentation, i18n, or missing tests;
- inspect post-edit content;
- duplicate compiler or linter checks;
- auto-approve extension permission requests;
- warn on routine reversible actions.

### `arolariu-context`

`arolariu-context` derives compact, task-relevant pointers from live repository
state.

Input signals, in descending confidence:

1. explicit file paths in the user request;
2. current working directory and nearest `AGENTS.md`;
3. path-instruction frontmatter matching explicit paths;
4. explicitly named project or domain;
5. task type matching a specialist agent or skill description.

The extension:

- prefers exact path and metadata matching over keyword substring maps;
- injects the smallest useful list of canonical files and source locations;
- reads volatile values directly from their source only when directly relevant;
- cites the source path for injected values;
- caps the additional context payload;
- injects nothing when confidence is low;
- never copies a static repository snapshot into its own source.

It does not hardcode:

- dependency or runtime versions;
- store, component, service, site, RFC, instruction, or asset counts;
- build and test commands;
- bounded context or architecture summaries;
- mutable source paths that can be discovered from current files.

### `arolariu-checker`

Rename and replace `arolariu-workflow` with `arolariu-checker`.

The checker is explicitly invoked and read-only with respect to repository
assets. Its tools are:

1. `arolariu_ai_inventory`
   - discovers agents, prompts, skills, instructions, extensions, memory, and
     client configuration;
   - reports frontmatter metadata, path, and role without hardcoded counts.
2. `arolariu_ai_doctor`
   - checks frontmatter shape, unique names, broken relative references,
     conflicting instruction scopes, volatile copied facts, forbidden model
     pins, stale command guidance, memory policy, and static extension
     structure;
   - returns file and line evidence with explicit severity.
3. `arolariu_validation_context`
   - resolves the smallest applicable existing validation guidance from
     canonical repository sources;
   - returns commands for the agent to execute with native tools;
   - never executes arbitrary commands itself.

Runtime extension status remains visible through Copilot's native extension
management. The checker does not claim another extension is healthy merely
because its files exist.

## Task Data Flow

1. The user states a task.
2. The default agent handles bounded work directly unless a specialist role is
   required.
3. The context extension, when available, identifies the smallest applicable
   canonical context. Static Copilot loading remains sufficient without it.
4. A matching skill supplies the repeatable workflow. A prompt may serve as a
   thin shortcut to that skill.
5. The agent inspects live source and neighboring patterns before proposing or
   making changes.
6. The risk gate decides whether the agent proceeds or asks.
7. The agent implements the smallest complete change and validates it with the
   narrowest existing checks.
8. Guardrails may deny or escalate an irreversible tool call, but native
   permissions remain authoritative.
9. The final response leads with the outcome and discloses only material
   assumptions, risk, incomplete validation, or blockers.
10. The checker is invoked when AI asset health or validation routing needs
    inspection. It is not run on every task.

## Risk-Based Autonomy

Agents proceed without additional approval when all of these are true:

- the task is explicit and in scope;
- the change is reversible;
- an established repository pattern exists;
- no protected risk category is crossed.

Within that boundary an agent may inspect, create, edit, rename, format, and
test the files needed to complete the task. The blanket rule requiring approval
before creating a file is removed.

Agents ask before:

- adding npm, NuGet, Python, system, MCP, or extension dependencies;
- changing authentication, authorization, or security behavior;
- changing data schemas or performing data migration;
- changing infrastructure, deployment, production workflows, or material
  cloud cost;
- destructive or irreversible operations;
- public API, product, or UX behavior where multiple materially different
  outcomes are valid and no safe default exists.

If the user explicitly requested a protected category, the agent still
confirms the concrete high-risk operation immediately before execution when
required by repository policy.

## Verification and Completion Behavior

Use the smallest existing targeted test, build, or lint command that proves the
changed behavior.

Routine frontend changes use `npm run test:unit` and
`npm run build:website` when both are relevant. Full website tests and global
lint remain final-pass or explicitly requested checks. Backend work uses the
smallest relevant project build and test selection.

Agents must possess command or file evidence before claiming completion. Final
responses do not need to dump routine validation details unless:

- validation failed or was incomplete;
- the user requested the details;
- residual risk depends on the evidence;
- the task is a review or audit where evidence is the deliverable.

Replace mandatory verbose assumption/risk/confidence blocks with concise
disclosure of material uncertainty only.

## Error Handling

- Do not silently fall back from a failed extension to a success-shaped result.
- Do not treat an extension source file as proof that the extension loaded.
- Tool handlers return explicit failures with actionable messages.
- Context extraction failure yields no injected context and a diagnostic log;
  static instructions continue to operate.
- Checker parsing failures identify the affected file and parser error.
- Guardrails ambiguity returns `ask`, not `allow`.
- Source/RFC contradictions are surfaced at the point they matter.
- If the installed CLI cannot attach extension hooks, stop the extension phase,
  preserve the completed static improvements, and report the exact runtime
  blocker.

## Event-Driven Maintenance

There is no scheduled review.

The change that invalidates guidance owns the corresponding AI update:

| Trigger | Required Update |
| --- | --- |
| Runtime or framework version changes | Update only the canonical `AGENTS.md` version table; task assets continue to reference it |
| Build, test, lint, format, or generation command changes | Update the root local-development contract and any workflow skill that must invoke the command |
| Architecture or accepted RFC changes | Update the owning RFC and only the path/domain delta whose executable rule changed |
| Copilot schema or feature changes | Update only the affected Copilot adapter, agent metadata, skill metadata, prompt metadata, or extension |
| New recurring agent mistake | Fix the source/pattern if unclear; otherwise update exactly one owning layer or retire the low-value asset |
| Extension startup or tool failure | Update extension code and troubleshooting evidence; never copy its responsibility into unrelated assets |
| First-class surface changes | Update the customization guide and remove or add only that surface's adapters |

Do not add `lastReviewed` dates. Git history identifies the last relevant
change.

## Rollout

### Phase 1: Authority Reset

- reconcile canonical facts with live source;
- condense root and local contracts;
- make path instructions orthogonal;
- retire global review instruction leakage;
- merge governance protocols;
- reset stale repository memory.

**Exit gate:** every retained fact and rule has one owner and no known
contradiction.

### Phase 2: Workflow Portfolio

- thin the five specialist agents;
- convert and merge workflows into the target skills;
- reduce prompts to four aliases;
- remove stale model and tool metadata;
- preserve a discoverable route for every retained capability.

**Exit gate:** each recurring task has one execution workflow and at most one
thin prompt alias.

### Phase 3: Extension Rebuild

1. Re-scaffold a minimal extension against the installed SDK.
2. Verify a no-op extension can attach to the current session.
3. Rebuild and load each extension in isolation.
4. Add Node built-in tests with each extension.
5. Load all three extensions together.
6. Verify unique tools and hook behavior.

**Exit gate:** all three extensions report healthy and expose only the approved
contracts. If the CLI runtime remains incompatible, this phase is blocked and
requires explicit user direction before PR creation.

### Phase 4: Surface Smoke Checks

- confirm CLI instruction, agent, skill, prompt, MCP, and extension discovery;
- confirm VS Code instruction, agent, skill, and prompt discovery;
- confirm Copilot coding agent setup and repository context;
- verify CODEOWNERS covers every retained security-sensitive AI path;
- run the final contradiction and broken-reference scan;
- update the customization guide with observed, not assumed, behavior.

**Exit gate:** all first-class surfaces consume the intended static core and
the guide accurately describes any surface-specific differences.

## Extension Tests

Use Node's built-in test runner and no new dependency.

### Guardrails

- dangerous PowerShell and shell command variants;
- protected versus unprotected branches;
- repository root versus specific in-scope deletion targets;
- unresolved variables and wildcard deletion targets;
- safe lookalike commands to control false positives;
- unmatched tools return no permission decision.

### Context

- explicit Windows and cross-surface repository paths;
- nearest `AGENTS.md` resolution;
- instruction frontmatter matching;
- multi-domain requests;
- low-confidence no-op behavior;
- deduplication and payload cap;
- live source value citation.

### Checker

- frontmatter parsing;
- missing and duplicate names;
- broken relative links;
- conflicting `applyTo` scopes;
- prohibited model pins and volatile fact copies;
- stale command detection against canonical guidance;
- memory policy violations;
- explicit failure output for malformed assets.

### Integration

- `extensions_reload`;
- `extensions_manage list`;
- `extensions_manage inspect` for each extension;
- invoke every custom checker tool;
- verify context hook registration;
- exercise guardrails through pure matcher tests and a harmless intercepted
  tool call;
- load each extension alone, then all three.

## Cross-Surface Smoke Checks

These are compatibility checks, not quality benchmarks.

### Copilot CLI

- `/env` reports the expected instructions, skills, agents, MCP servers, hooks,
  and extensions;
- each retained agent is selectable;
- each retained skill is discoverable;
- all three extensions are healthy;
- checker tools are callable.

### VS Code

- repository and path instructions load for representative frontend, backend,
  component, infrastructure, and workflow files;
- retained agents and prompts are discoverable;
- a representative skill invocation reads live sibling source before
  proposing changes.

### Copilot Coding Agent

- `copilot-setup-steps.yml` completes when setup changes are required;
- root and path instructions are available;
- a representative task can discover the correct project context without
  relying on CLI extensions.

## Atomic Commit Plan

1. `docs(agentic): design AI footprint v2`
   - this design only.
2. `refactor(agentic): establish canonical authority`
   - root/local contracts, orthogonal instructions, governance consolidation,
     and memory reset.
3. `refactor(agentic): consolidate workflow assets`
   - five agents, merged skills, four prompts, and metadata cleanup.
4. `refactor(agentic): rationalize client configuration`
   - Copilot-first configuration and removal of duplicated non-first-class
     client configuration.
5. `feat(copilot): rebuild context extension`
   - context behavior, Node tests, and isolated load evidence.
6. `feat(copilot): harden guardrails extension`
   - guardrails behavior, Node tests, and isolated load evidence.
7. `feat(copilot): add AI checker extension`
   - checker tools, Node tests, replacement of the workflow extension, and
     combined load evidence.
8. `docs(agentic): align customization guidance`
   - final guide, support matrix, maintenance triggers, troubleshooting, and
     contradiction cleanup.

Tests land in the same commit as the behavior they cover. If implementation
reveals a smaller independently revertible boundary, splitting a planned commit
is allowed; combining unrelated boundaries is not.

Every commit includes:

```text
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## Pull Request

After all exit gates:

- push `refactor/ai-footprint-v2`;
- open a pull request against `preview`;
- summarize authority consolidation, workflow routing, extension behavior, and
  removed compatibility surfaces;
- include local validation evidence and any manual surface checks;
- identify residual runtime or surface risks;
- do not enable auto-merge;
- do not force-push.

## Acceptance Criteria

1. Each volatile fact has one canonical source.
2. Root, local, and path instructions have non-overlapping responsibilities.
3. Code-review behavior no longer applies globally to non-review work.
4. Five thin specialist agents remain with no copied versions, commands,
   tutorials, stale model pins, or generic governance blocks.
5. Nine workflow skills own the retained repeatable workflows.
6. Four prompt files remain as thin skill aliases.
7. Repository memory contains no source-derived snapshots.
8. The AI customization guide contains no hardcoded asset counts or false
   surface/extension claims.
9. Copilot is the only maintained first-class client family.
10. The three CLI extensions implement the approved narrow contracts.
11. No extension uses `approveAll`, arbitrary shell execution, implicit
    unmatched permission approval, or AI asset mutation.
12. Extension unit tests pass with Node's built-in runner.
13. All three extensions load alone and together, or an external runtime
    blocker is demonstrated and explicitly accepted before PR creation.
14. CLI, VS Code, and cloud-agent smoke checks match the documented support
    model.
15. The work is delivered as atomic commits on
    `refactor/ai-footprint-v2` with a PR against `preview`.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| Consolidation removes useful nuance | Preserve invariants and make skills inspect current sibling code instead of preserving tutorials |
| No CI allows future drift | Use one owner per fact, an explicit event-trigger map, checker diagnostics, and CODEOWNERS |
| Context routing injects irrelevant guidance | Prefer explicit paths, cap payloads, deduplicate, and no-op at low confidence |
| Guardrail regexes produce false confidence | Keep native permissions authoritative, narrow the policy, and test safe plus dangerous variants |
| Extension SDK/runtime changes again | Re-scaffold against the installed SDK, test each extension independently, and preserve static-core completeness |
| Fewer prompts reduce discoverability | Keep four high-frequency shortcuts and give every skill a precise trigger description |
| Removing non-Copilot config affects occasional use | Retain the zero-maintenance `CLAUDE.md` alias and document non-Copilot use as best-effort |
| Event-only upkeep is forgotten | Put the invalidation map in canonical governance and assign updates to the change that caused them |

## Assumptions

- `preview` remains the intended integration branch for this initiative.
- GitHub Copilot CLI, VS Code, and the Copilot coding agent continue to consume
  the repository asset locations documented by their current surfaces.
- Node 24 remains available for extension tests.
- Existing repository scripts remain the validation source of truth.
- No new dependency is required to implement the three extensions.
- The user prefers pragmatic static and runtime checks over formal quality
  benchmarks or telemetry.

## Decision Record

The following decisions were explicitly approved during brainstorming:

- architectural path with a permanent design and implementation plan;
- quality-adjusted throughput as the primary goal;
- Copilot CLI, VS Code, and coding agent as first-class surfaces;
- no benchmark, telemetry, generated artifacts, or AI-specific CI;
- aggressive consolidation;
- shared static guarantees with optional CLI acceleration;
- three retained extensions: guardrails, context, and read-only checker;
- risk-based autonomy;
- event-driven maintenance only;
- phased rollout and local validation;
- separate branch from `preview`, atomic commits, and PR back to `preview`.
