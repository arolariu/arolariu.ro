# GitHub Copilot Instructions - arolariu.ro

`AGENTS.md` is the canonical source for repository facts, versions, commands,
architecture, testing, security, and Git conventions. This file adds only
Copilot execution behavior.

## Authority and Context

Before acting:

1. Read live source and configuration.
2. Read the nearest `AGENTS.md`.
3. Load only matching `.github/instructions/*.instructions.md`.
4. Use an agent for domain ownership and a skill for a repeatable workflow.
5. Treat prompts as local VS Code shortcuts, not competing workflow sources.

When sources conflict, follow the authority order in root `AGENTS.md`. Use
source for current behavior and accepted RFCs for intent. Ask only when the
resolution changes behavior or crosses a protected risk boundary.

## Risk-Based Autonomy

Proceed without another checkpoint when the task is explicit, reversible,
in-scope, and follows an established pattern. This includes creating, editing,
renaming, formatting, and testing the files needed to complete the task.

Ask before:

- adding or replacing dependencies;
- changing authentication, authorization, or security behavior;
- changing schemas or migrating data;
- creating a bounded context or Zustand store;
- changing infrastructure, deployment, production workflows, or material
  cloud cost;
- destructive or irreversible operations;
- choosing among materially different public API, product, or UX behaviors
  without a safe established default.

An explicit request authorizes ordinary in-scope file creation. It does not
authorize an irreversible or security-sensitive operation without the required
concrete checkpoint.

## Editing Discipline

- Inspect current sibling source before adding a new pattern.
- Reuse existing helpers and abstractions.
- Make the smallest complete change; do not perform unrelated cleanup.
- Preserve user changes in a dirty worktree.
- Use strict types; never introduce TypeScript `any`.
- Keep business logic out of Brokers and service dependencies within the
  repository limit.
- Keep Server Components server-side unless interaction requires a client
  boundary.
- Use CSS Modules instead of inline styles.
- Keep user-facing copy in `next-intl`.
- Add tests for changed behavior.
- Never commit secrets or `docs/superpowers/**` / `.superpowers/**`.
- Do not create a worktree unless the user explicitly requests one.
- Never force-push `main` or `preview`.

## Verification

- Run the smallest existing test, build, or lint command that proves the
  changed behavior.
- Routine frontend work uses `npm run test:unit` and
  `npm run build:website` when both apply.
- Reserve `npm run lint` and `npm run test:website` for a final pass or an
  explicit request.
- Use targeted `dotnet build` and `dotnet test` selections for backend work.
- Documentation-only changes do not require an application build unless a
  documentation check exists.
- Do not claim success without command or file evidence.
- Do not dump routine evidence into the final response unless requested or
  needed to explain risk, failure, or incomplete validation.

## Task Assets

- `.github/agents/*.agent.md` defines specialist scope and routing.
- `.github/skills/*/SKILL.md` defines portable execution workflows for CLI,
  VS Code, and Copilot coding agent.
- `.github/prompts/*.prompt.md` defines local VS Code shortcuts.
- `.github/extensions/*/extension.mjs` defines optional CLI acceleration.

Do not encode the same workflow in more than one skill. A prompt may delegate
to a skill but must not reproduce it.

## Memory

Repository memory may contain only durable, actionable context that is not
directly derivable from tracked source. Do not store versions, commands,
architecture summaries, counts, discoverable paths, task state, secrets, or
personal data. Canonical source always overrides memory.

## Failure and Uncertainty

- Surface tool and extension failures explicitly; do not return
  success-shaped fallbacks.
- Do not treat an extension file as proof that the extension loaded.
- Report only material assumptions, residual risks, blockers, or incomplete
  validation.
- Stop when requirements conflict and no safe behavior-preserving default
  exists.
