# Source and Link Audit

Run this checklist for every documentation change after drafting and before
completion. An unchecked material claim blocks completion.

## Claim-to-Source Audit

- [ ] Every statement is classified as current behavior, accepted intent,
  operational instruction, illustrative example, or future proposal.
- [ ] Current behavior is verified against live source/configuration,
  consumers, and tests; accepted intent is verified against the owning RFC.
- [ ] Runtime, framework, language, package, tool, and protocol **versions**
  come from their canonical live owner; duplicated version snapshots are
  removed or linked.
- [ ] Numeric **counts**, ranges, thresholds, coverage claims, inventory sizes,
  generated-tier totals, and “all/only” claims are recomputed or replaced with
  a source-owned pointer.
- [ ] Repository **paths**, filenames, symbols, namespaces, routes, environment
  keys, workflow names, and generated locations exist with exact casing.
- [ ] Locale/language inventories and user-visible example text match their
  live message/configuration owners.
- [ ] Documented **commands**, flags, working directories, prerequisites, and
  expected outcomes come from current manifests, project targets, scripts, or
  workflows and were exercised when safe.
- [ ] Code/config **examples** use current imports, signatures, types,
  nullability, providers, rendering/runtime context, error handling, and safe
  non-secret values.
- [ ] No comment claims an error, side effect, cache, retry, cancellation,
  performance, accessibility, authentication, or authorization behavior that
  source does not prove.

## Canonical Ownership and Duplication

- [ ] Search the target and neighboring guidance for each version, command,
  architecture rule, inventory, or repeated paragraph.
- [ ] Keep one owner: root guidance for repository-wide facts, manifests and
  configuration for machine state, local guides for local operation, RFCs for
  decisions, and API comments for caller contracts.
- [ ] Replace duplicate canonical facts with a concise link/source pointer
  unless this document genuinely owns the value.
- [ ] Generated output is not edited or promoted to a source of truth.
- [ ] Historical content is retained only when live-confirmed; stale prompt,
  agent, comment, or README wording is not copied by authority.

## Links and Anchors

- [ ] Every relative Markdown link resolves from the file containing it.
- [ ] Link targets use repository-correct casing and remain within intended
  published/content boundaries.
- [ ] Every local anchor matches the heading slug produced by the active
  renderer; duplicate headings are disambiguated.
- [ ] Renamed or moved files leave no stale inbound links in the affected
  scope.
- [ ] External links use the primary durable source, contain no secrets or
  session-specific URLs, and were checked when network access is available.
- [ ] `cref`, `@see`, `{@link ...}`, and code-formatted live source pointers
  resolve to current symbols/files.

## Examples and Operational Safety

- [ ] Examples are minimal but complete enough to avoid teaching an invalid
  usage.
- [ ] Output snippets are labeled illustrative when they are not asserted
  stable.
- [ ] Placeholders cannot be mistaken for production credentials, personal
  data, tenant/resource identifiers, or executable destructive values.
- [ ] Failure and rollback guidance is reversible and does not bypass type,
  warning, security, or deployment safeguards.
- [ ] A new/material RFC decision, behavior choice, or protected-risk change
  has explicit approval; otherwise the document stops at evidence and options.

## Resource and Scope Hygiene

- [ ] Every new resource is linked from its owning `SKILL.md` with a named
  trigger, and every link is reachable.
- [ ] No resource is orphaned, no resource folder is empty, and no workflow is
  duplicated across resources.
- [ ] Required headings and frontmatter match the owning asset contract.
- [ ] The diff contains only approved documentation files and no production,
  generated, dependency, configuration, or unrelated formatting changes.

## Validation Record

- [ ] Run the smallest documentation generator/compiler/build/link check
  selected from current live tooling, or record why no such check applies.
- [ ] Re-run the exact failing check after a troubleshooting correction.
- [ ] For agentic documentation, manually validate frontmatter, ownership,
  relative links, and copied volatile facts. Run the repository AI-asset
  doctor when it is registered in the current interactive surface; otherwise
  record that it was unavailable rather than treating it as required.
- [ ] Run `git diff --check`.
- [ ] Inspect the scoped diff and record any unvalidated external links,
  unavailable toolchain, or intentional live/RFC drift.
