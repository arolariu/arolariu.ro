# XML Documentation Catalog

Use this catalog only for C# XML comments. Follow
[RFC 2004](../../../../docs/rfc/2004-comprehensive-xml-documentation-standard.md),
then verify every statement against the live declaration, implementation,
tests, exception family, and current documentation generator.

## Coverage

Public APIs require useful XML documentation. Include protected members and
documented internal surfaces when their visibility or generated-reference
configuration exposes them. Do not suppress missing-comment warnings or add
verbose comments to generated/private boilerplate.

## Element Decisions

| Element | Requirement | Useful content |
| --- | --- | --- |
| `<summary>` | Baseline for each documented type/member | Caller-visible role or behavior, not the member name rewritten as prose |
| `<remarks>` with `<para>` | Use for architecture role, validation, side effects, idempotency, ownership, mutability, thread safety, or trade-offs | Only current behavior and accepted intent; use structured lists when they improve scanning |
| `<param name="">` | One per parameter with an exact matching name | Domain role, valid/default/null values, units, partition/ownership meaning, cancellation purpose |
| `<typeparam name="">` | One per non-obvious generic parameter | Semantic constraint and how it relates to inputs/outputs |
| `<returns>` | Required for a value-returning member and useful for asynchronous completion | Result meaning, null/empty behavior, collection semantics, and completion outcome |
| `<value>` | Use when a property/field's domain meaning, default, or mutability is not obvious | Valid values, lifecycle, ownership, and sentinel behavior |
| `<exception cref="">` | One per intentionally escaping exception category | Exact caller-visible type and triggering condition, including cancellation when it escapes |
| `<example><code>` | Use for non-obvious public construction or invocation | Current public API, realistic typed values, and required disposal/async/error handling |
| `<see cref="">` / `<seealso cref="">` | Use for resolvable symbol relationships | Owning interface, implementation, related value, exception, or architecture type |
| `<inheritdoc/>` | Use when an inherited/interface contract is accurate and complete | Add local documentation only for observable behavior not already inherited |

Keep XML well formed. Use `<c>`, `<paramref>`, `<typeparamref>`, and
`<see langword="">` rather than fragile plain-text symbol references.

## Type and Member Context

### Types

Explain the domain role, layer responsibility, mutability, ownership,
thread-safety, and explicit exclusions only when source or accepted RFCs prove
them. Do not turn an implementation class into an architecture specification.

### Methods

Describe validation, side effects, idempotency, partition/ownership behavior,
and observable ordering when relevant. The summary should remain independent
of a broker, SDK, or algorithm unless that dependency is itself the public
contract.

### Properties, records, and enums

Document domain meaning, defaults/sentinels, units, equality/mutability, and
serialization consequences. Enum-member comments should distinguish business
states; “Gets or sets” and “Value one” add no information.

## Async, Cancellation, and Error Contracts

- For `Task<T>`/`ValueTask<T>`, describe the resulting `T`, not merely “a task.”
- For non-generic tasks, state what must be complete when the task finishes.
- Document the `CancellationToken` scope and
  `<exception cref="OperationCanceledException">` only when cancellation
  propagates to this caller.
- Trace The Standard exception classification through the live TryCatch path.
  Document the exact outer exception exposed at this layer and meaningful inner
  cause only when callers rely on it.
- Do not document `.ConfigureAwait(false)`, logging calls, or Activity mechanics
  as API guarantees unless they create an observable contract.
- Nullability in prose, XML, and the C# type must agree. Do not claim `null` for
  a non-nullable return merely because an older comment did.

## Meaningful Examples

Examples must compile conceptually against the current namespace, constructor,
signature, nullability, cancellation, and disposal model. Prefer a live test or
consumer pointer when setup would dominate the example. Never include secrets,
production identifiers, provider payloads, or copied transient output.

## Anti-Obvious-Comment Guidance

Avoid:

```csharp
/// <summary>Gets the merchant.</summary>
/// <param name="id">The id.</param>
/// <returns>The merchant.</returns>
```

Add only verified contract detail:

```csharp
/// <summary>Resolves one merchant within the supplied ownership partition.</summary>
/// <param name="id">The canonical merchant identifier.</param>
/// <param name="cancellationToken">The token used to cancel the lookup.</param>
/// <returns>The merchant visible to the caller.</returns>
```

## Final XML Review

- All `name` and `cref` values resolve and match the signature.
- Returns, nullability, cancellation, and escaping exception types match live
  behavior and tests.
- Architecture terms match the accepted RFC and current dependency direction.
- Examples use current public APIs and safe values.
- XML generation remains enabled by live project configuration, and warnings
  are fixed at the comment rather than suppressed.
