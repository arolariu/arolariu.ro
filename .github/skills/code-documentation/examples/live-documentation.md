# Live Documentation

These are dynamic inspection targets, not copy sources. Reopen every path and
derive claims from current code, tests, and configuration.

## TypeScript Utility Contracts

**Live source**

- `sites/arolariu.ro/src/lib/utils.generic.ts`
- `sites/arolariu.ro/src/lib/utils.generic.test.ts`

**Why representative**

The utility module combines file-level ownership, public constants, runtime
validation, assertion signatures, parameters, escaping errors, return
semantics, examples, and cross-references.

**Inspect**

Match comments to current branches and tests, especially accepted identifier
forms, sentinels, defaults, and thrown messages. Choose a different sibling for
React lifecycle, server-only transport, or a domain-specific type; do not copy
literal values into unrelated documentation.

## React Rendering and Lifecycle Context

**Live source**

- `sites/arolariu.ro/src/contexts/FontContext.tsx`
- `sites/arolariu.ro/src/contexts/FontContext.test.tsx`

**Why representative**

The module explains why a client boundary exists, provider requirements,
browser persistence, cross-tab events, cleanup, memoized values, accessibility
intent, and a hook's caller-visible error.

**Inspect**

Verify every side effect and cleanup against the implementation and tests.
Derive provider names, public fields, browser behavior, and rendering context
from the live file. Choose another sibling for a Server Component, server
action, or component without browser state.

## Documentation Pipeline JSDoc

**Live source**

- `scripts/docs-assemble.ts`
- `scripts/docs-assemble.test.ts`
- `typedoc.website.json`
- `typedoc.components.json`
- `sites/docs.arolariu.ro/project.json`

**Why representative**

The orchestrator's module and exported-function comments connect purpose,
parameters, asynchronous failures, platform behavior, generated tiers, and
tests to the actual documentation toolchain.

**Inspect**

Trace comments to current extractor calls, output validation, cleanup, and
project targets. Do not copy tool versions, target counts, command snapshots,
or output paths without re-reading their canonical configuration. Choose
application source when documenting a consumer-facing API.

## C# Public Contract and Error Classification Audit

**Live source**

- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Management/IInvoiceManagementService.cs`
- `sites/api.arolariu.ro/src/Invoices/Services/Management/InvoiceManagementService.Exceptions.cs`

**Why representative**

These partials are useful for auditing documentation across an interface,
implementation, and exception classifier. They are not a complete exception
documentation exemplar: current public comments omit some propagated
cancellation and service-exception outcomes required by RFC 2004.

**Inspect**

Trace every caller-visible cancellation and service exception through TryCatch
and tests, then compare the result with each public comment. Treat omissions as
documentation gaps, not as evidence that the exception cannot escape. Confirm
parameter order/nullability and avoid documenting inner implementation details
as public guarantees. Choose the matching Foundation, Orchestration,
Processing, or Broker sibling for another layer.

## Rich XML Type Documentation

**Live source**

- `sites/api.arolariu.ro/src/Common/Telemetry/Tracing/ActivityExtensions.cs`
- `sites/api.arolariu.ro/Directory.Build.props`
- `scripts/docs-assemble.ts`

**Why representative**

The extension type demonstrates summaries, structured remarks, an XML example,
`cref` links, nullable extension returns, and per-member parameter/return
contracts. The configuration and orchestrator show how XML files and generated
reference output are currently produced.

**Inspect**

Confirm nullable behavior and emitted tags from each method rather than
assuming every extension has the same contract. Derive generator behavior from
live project configuration; choose a service interface for cancellation and
typed exceptions.

## Operational README and Source Ownership

**Live source**

- `sites/docs.arolariu.ro/README.md`
- `sites/docs.arolariu.ro/project.json`
- `scripts/docs-assemble.ts`
- `package.json`
- `typedoc.website.json`
- `typedoc.components.json`

**Why representative**

The README is organized around audience, data flow, local operation,
deployment, and extractor-specific troubleshooting, with nearby machine-readable
owners for its claims.

**Inspect**

Verify every prerequisite, command, generated path, extractor, route, and
workflow statement against current owners. Treat the README as prose, not as
authority for versions or commands. Choose a smaller local README when the
reader needs one service rather than the unified docs pipeline.

## RFC Standards and Indexing

**Live source**

- `docs/rfc/README.md`
- `docs/RFC_TEMPLATE.md`
- `docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md`
- `docs/rfc/2004-comprehensive-xml-documentation-standard.md`
- `.github/agent-governance/operating-protocol.md`

**Why representative**

Together these files show current indexing/status guidance, the general RFC
scaffold, implemented documentation standards, explicit source-accuracy notes,
and the repository rule separating accepted intent from live behavior.

**Inspect**

Derive status, identifier, filename, sections, and related links from the
current index and closest sibling. Revalidate all RFC examples against source;
do not copy their framework versions, tool configuration, commands, or source
inventories. Choose another accepted RFC only when its decision shape matches
the approved concern.
