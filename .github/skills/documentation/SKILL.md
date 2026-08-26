---
name: documentation
description: Add, correct, or audit source-grounded JSDoc, XML documentation, README, RFC, operational, reference, example, link, and drift guidance without changing behavior.
---

# Documentation

## When to Use

- Adding, correcting, or removing stale JSDoc/TSDoc or C# XML comments.
- Updating a README, runbook, troubleshooting page, or technical reference.
- Recording an already approved architecture decision or aligning an RFC with
  its live implementation.
- Auditing examples, links, commands, paths, or source-derived claims.

## When Not to Use

- Do not use documentation edits to change production logic, public behavior,
  schemas, authentication, infrastructure, or dependency state.
- Do not invent a product or architecture decision and present it as settled.
- Do not create or materially change an RFC decision without explicit
  approval.
- Do not hand-edit generated reference output; update its source comments or
  owning generator/configuration.
- Use the owning implementation skill when code must change, then update its
  documentation within that workflow.

## Required Inputs

- The target document or public API and its intended reader.
- Live implementation, configuration, consumers, tests, and generated surface
  behind every behavioral claim.
- Existing neighboring documentation and the current source owner for paths,
  commands, versions, inventories, and examples.
- RFC 1002 for JSDoc/TSDoc, RFC 2004 for XML documentation, or the accepted
  RFC that owns architectural intent.
- Current documentation tooling and the smallest existing validation that
  exercises the changed surface.

## Decision Points

1. Which document type owns the information: JSDoc/TSDoc, XML documentation,
   README/operational guidance, accepted RFC update, new RFC proposal, or
   troubleshooting/reference?
2. Is each statement current behavior, architectural intent, operational
   procedure, or an example? Live source owns behavior; accepted RFCs own
   intent.
3. What is useful to this reader beyond the signature or source itself?
4. Which values are volatile and should link to their canonical owner instead
   of being copied?
5. Does the change merely correct documentation, or would it establish a new
   or materially different decision requiring approval?
6. Which generator, compiler, docs build, or link check can prove the result?

## Core Procedure

1. Read the live implementation/configuration, its consumers and tests, the
   existing document, a strong current sibling, and relevant history.
2. Select the document type before editing and load only its matching catalog.
3. Identify the reader and write down the source owner for every non-obvious
   behavior, path, symbol, command, version, count, locale, and example.
4. Preserve accurate content, remove stale or duplicated claims, and explain
   contracts, constraints, ownership, errors, side effects, and rationale that
   are not obvious from the declaration.
5. Keep examples minimal and realistic. Derive imports, values, error
   behavior, rendering/async context, and invocations from current source.
6. For an RFC, separate observed implementation from approved intent and make
   alternatives and consequences explicit. Do not cross the approval boundary.
7. Run the source-and-link audit for every documentation update.
8. Run the smallest current documentation-specific validation, then inspect
   the scoped diff. Use `git diff --check` when no narrower documentation check
   applies.

## Resource Triggers

Load only the resource required by the current decision or failure:

| Named trigger | Resource |
| --- | --- |
| Before choosing where or how to document the request | [Document-type decision table](references/document-type-decision-table.md) |
| After selecting a TypeScript/JavaScript/React public API | [JSDoc catalog](references/jsdoc-catalog.md) and RFC 1002 |
| After selecting a C# public API | [XML documentation catalog](references/xml-documentation-catalog.md) and RFC 2004 |
| Only after approval to create or materially update an RFC decision | [RFC writing catalog](references/rfc-writing-catalog.md) |
| When choosing a current sibling, source owner, or docs-tooling example | [Live documentation](examples/live-documentation.md), then reopen the listed paths |
| Only after a live sibling confirms the same stable structural pattern | [Stable documentation patterns](templates/stable-documentation-patterns.md) |
| Before completing every documentation change | [Source-and-link audit](checklists/source-and-link-audit.md) |
| Only after a concrete generator, compiler documentation warning, TypeDoc, link, frontmatter, or RFC/source-drift failure | [Documentation troubleshooting](references/troubleshooting.md) |

Do not preload both API-comment catalogs or troubleshooting.

## Verification

- Every behavioral and architectural statement has the correct current owner.
- JSDoc/TSDoc follows RFC 1002; XML comments follow RFC 2004 and match the
  exact public signature and escaping errors.
- README and operational steps use live paths and invocations selected from
  their owning configuration rather than copied repository snapshots.
- RFC status, context, decision, alternatives, consequences, and source
  alignment are explicit, and no unapproved decision was introduced.
- Relative links and anchors resolve from the edited file; source pointers,
  symbols, examples, locales, versions, counts, and commands were rechecked.
- The relevant current documentation validation passes, generated output was
  not edited, and the final diff contains no behavior or out-of-scope changes.

## Stop and Ask

- A new or materially changed RFC, public, product, or architecture decision is
  required.
- Live behavior conflicts with accepted architectural intent and resolving the
  drift would change behavior.
- Accurate documentation would expose credentials, private data, internal
  security details, or unsafe operational steps.
- The only fix requires changing production logic, warning policy,
  dependencies, infrastructure, another protected owner, or unapproved
  documentation-tooling behavior.
- Two materially different reader contracts or canonical owners remain valid.

## Completion Contract

Report what became clearer or current, the source owners inspected, the
documentation-specific validation and link/source audit evidence, and only
material residual drift or incomplete validation. Do not claim an application
build when the documentation-only change did not require one.
