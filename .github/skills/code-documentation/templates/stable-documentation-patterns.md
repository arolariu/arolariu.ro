# Stable Documentation Patterns

Use a template only after a current sibling confirms the same document and
reader contract. Replace every placeholder from live source; remove
inapplicable optional sections rather than filling them with generic prose.

## JSDoc Exported Callable Pattern

### Provenance

- `docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md`
- `sites/arolariu.ro/src/lib/utils.generic.ts`
- `sites/arolariu.ro/src/contexts/FontContext.tsx`

### Invariants

- The summary states caller-visible purpose rather than implementation.
- Parameters describe domain role, constraints, defaults, and nullability.
- Returns describe meaning, empty/absence cases, and asynchronous completion.
- Remarks include only non-obvious, source-proven context.
- Errors name only escaping caller-visible failures.
- Examples use the current public surface and safe values.

### Live-derived values

Derive symbol/import names, runtime or rendering context, parameter names,
defaults, result/nullability, side effects, cleanup, error types, providers,
example values, and links from the declaration, implementation, consumers, and
tests.

### Invalidated when

Do not use when the symbol is trivial/private/generated, a type/property needs
a different contract, the example requires extensive setup, or live tooling
uses a different supported tag shape.

```typescript
/**
 * {{Precise caller-visible purpose.}}
 *
 * @remarks
 * {{Non-obvious runtime context, guarantees, constraints, and trade-offs
 * proven by live source.}}
 *
 * @param {{parameterName}} - {{Domain role, valid values, default, and
 * null/undefined behavior.}}
 * @returns {{Meaning of the result, absence/empty cases, and async completion.}}
 * @throws {{{EscapingError}}} {{Exact condition visible to the caller.}}
 *
 * @example
 * ```typescript
 * {{Minimal current public usage with safe values.}}
 * ```
 *
 * @see {@link {{CurrentRelatedSymbolOrDurableUrl}}}
 */
```

Delete `@throws`, `@example`, `@see`, or extended remarks when the live
contract does not justify them.

## C# XML Public Member Pattern

### Provenance

- `docs/rfc/2004-comprehensive-xml-documentation-standard.md`
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.cs`
- `sites/api.arolariu.ro/src/Common/Telemetry/Tracing/ActivityExtensions.cs`

### Invariants

- XML is well formed and symbol references resolve.
- Summary, parameter, return/value, cancellation, and exception text agree
  with the exact C# signature and implementation.
- Remarks explain domain/layer context only when live source and accepted RFCs
  agree.
- Async documentation describes completion/result semantics, not just `Task`.
- `<inheritdoc/>` is used only when the inherited contract remains accurate.

### Live-derived values

Derive namespace/type/member names, generic and parameter names, nullability,
result/collection behavior, cancellation propagation, exact outer exceptions,
layer role, side effects, and `cref` targets from current source and tests.

### Invalidated when

Do not use when inheritance already supplies a complete contract, the member is
private/generated/trivial, an exception is caught or translated before this
boundary, or documentation would mask a nullable/signature defect.

```csharp
/// <summary>
/// {{Precise caller-visible behavior.}}
/// </summary>
/// <remarks>
/// <para>
/// {{Only non-obvious validation, ownership, side effects, idempotency, or
/// architecture context proven by current source.}}
/// </para>
/// </remarks>
/// <param name="{{parameterName}}">
/// {{Domain role, valid/default/null values, and related constraints.}}
/// </param>
/// <returns>
/// {{Result meaning, null/empty behavior, or completion condition.}}
/// </returns>
/// <exception cref="{{EscapingException}}">
/// {{Exact triggering condition visible at this boundary.}}
/// </exception>
/// <seealso cref="{{RelatedSymbol}}"/>
```

Remove elements that do not apply; add one exact `param`, `typeparam`, or
`exception` element per live contract item.

## Operational README Pattern

### Provenance

- `sites/docs.arolariu.ro/README.md`
- `sites/docs.arolariu.ro/project.json`
- `docs/rfc/README.md`

### Invariants

- The reader, scope, owner, prerequisites, procedure, expected result, and
  recovery path are explicit.
- Machine-readable owners remain canonical for commands, versions, paths, and
  inventories.
- Commands state their working directory and use only current supported modes.
- Security-sensitive values are named as inputs, never shown.
- Links lead to deeper decisions/reference instead of duplicating them.

### Live-derived values

Derive names, prerequisites, commands, flags, working directories, generated
paths, expected output, deployment/runtime ownership, troubleshooting
signatures, and related links from current manifests, scripts, project config,
workflows, and source.

### Invalidated when

Do not use when the page is an API contract, an architecture decision, a
generated inventory, or a command has no stable supported owner.

```markdown
# {{Surface or workflow}}

{{One paragraph naming the reader, purpose, and owner.}}

## Scope

- Owns: {{bounded responsibilities}}
- Does not own: {{adjacent responsibilities and links}}

## Prerequisites

{{Requirements linked to their canonical owners.}}

## Procedure

1. {{Current step with working directory and expected transition.}}
2. {{Current step with safe placeholders for required inputs.}}

## Verification

{{Observable success evidence and current narrow check.}}

## Troubleshooting

| Symptom | First probe | Safe recovery |
| --- | --- | --- |
| {{Exact symptom}} | {{Source-owned diagnostic}} | {{Reversible correction}} |

## Related Sources

- {{Live configuration/source owner}}
- {{Accepted RFC or deeper reference}}
```

## Approved RFC Decision Pattern

### Provenance

- `docs/RFC_TEMPLATE.md`
- `docs/rfc/README.md`
- `.github/agent-governance/operating-protocol.md`

### Invariants

- Explicit approval exists before a decision is written as settled.
- Context, decision, alternatives, consequences, and source alignment are
  distinct.
- Current behavior and approved intent are not conflated.
- Status and index placement follow the current RFC catalog.
- Volatile implementation detail is linked rather than copied.

### Live-derived values

Derive identifier, filename, status, title, component scope, current behavior,
source links, constraints, alternatives, consequences, validation, rollout,
and index updates from the approval record and current repository.

### Invalidated when

Do not use without approval, when an existing RFC owns the decision, when the
change is only a local implementation detail, or when protected-risk choices
remain unresolved.

Use the canonical [`docs/RFC_TEMPLATE.md`](../../../../docs/RFC_TEMPLATE.md)
instead of copying an RFC skeleton into this skill.

When completing the canonical template:

- distinguish observed current behavior from the approved decision;
- make alternatives credible and evidence-based;
- state positive, negative, migration, and operational consequences;
- link implementation and validation owners;
- identify intentionally absent work and residual risk;
- remove template-only sections only when they are genuinely inapplicable;
- do not invent status, authors, identifiers, or approval.
