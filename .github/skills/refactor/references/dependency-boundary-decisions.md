# Dependency Boundary Decisions

Use this resource when extraction or movement changes an import, project
reference, constructor dependency, rendering boundary, or owning directory.
Read the live local guide first; this table adds refactor decisions rather than
replacing repository architecture.

## Boundary Matrix

| Proposed move | Default decision | Evidence to inspect | Stop condition |
| --- | --- | --- | --- |
| Route component/logic to another route | Keep it route-local unless multiple live routes need the same domain behavior and already share its contracts | Both routes, colocated tests, messages, CSS Modules, and server/client ownership | Reuse would require a new public UX abstraction or couple unrelated domains |
| Website code to website-shared `src/components`, `src/hooks`, `src/lib`, or `src/types` | Move only when the behavior is website-wide and remains owned by the website | Direct consumers, aliases, server-only/client-only imports, tests, and the [website guide](../../../../sites/arolariu.ro/AGENTS.md) | The candidate is used once, contains route/domain policy, or changes client/server placement |
| Website code to `@arolariu/components` | Do not make an incidental shared-library change; require the task to explicitly approve a domain-agnostic shared API | Package public entry points, peer dependencies, package tests, and [component RFC](../../../../docs/rfc/1006-component-library-architecture.md) | The abstraction contains website copy, routing, auth, data access, or domain types |
| Shared component package toward website code | Reject the dependency; keep the package independent and let the website compose it | Package manifest/imports and root dependency direction | The move would import a site alias, route module, messages, store, or website type into the package |
| CV or status site toward website/shared package | Preserve standalone ownership unless an explicit architecture decision says otherwise | The site's nearest `AGENTS.md`, manifest, imports, and deployment/build configuration | Reuse violates the CV boundary or couples status behavior to a React/website package |
| Endpoint or worker coordination inside the API | Use the current Management entry boundary defined by the [API guide](../../../../sites/api.arolariu.ro/AGENTS.md) and verified by architecture tests | Adapter parameters/fields, service interfaces, constructor tests, DI registration, exception mapping | The move bypasses Management or needs a new application contract |
| Heavy workflow or multi-stage coordination between existing API services | Select Processing or Orchestration from the live API guide; keep Foundation focused and Brokers thin | Service dependencies, TryCatch/telemetry partials, architecture tests, current RFC intent | Foundation would call Foundation, Broker would gain business logic, or dependency limits would be hidden |
| Code shared across API bounded contexts | Prefer the existing owning context; move to Common only for a truly context-neutral contract already needed by multiple contexts | All consumers, project references, namespaces, serialization, and [DDD RFC](../../../../docs/rfc/2001-domain-driven-design-architecture.md) | Moving it would erase domain language or create reverse/circular references |

## Decision Sequence

1. Identify the current owner and proposed owner.
2. List inbound consumers and outbound dependencies for both.
3. Check public entry points, aliases/barrels, project references, DI, tests,
   configuration, and generated artifacts.
4. Confirm the proposed direction against live `AGENTS.md`, matching
   instructions, and architecture tests.
5. Characterize behavior at the old boundary.
6. Move the smallest unit and validate the dependency graph before moving
   another.

## Live Enforcement Pointers

- Workspace graph inputs and build dependencies:
  [`nx.json`](../../../../nx.json).
- Website-to-component consumption:
  [`sites/arolariu.ro/package.json`](../../../../sites/arolariu.ro/package.json)
  and
  [`packages/components/package.json`](../../../../packages/components/package.json).
- Standalone CV boundary:
  [`sites/cv.arolariu.ro/AGENTS.md`](../../../../sites/cv.arolariu.ro/AGENTS.md).
- Status-site local ownership:
  [`sites/status.arolariu.ro/AGENTS.md`](../../../../sites/status.arolariu.ro/AGENTS.md).
- API service graph enforcement:
  [`InvoiceUnifiedLayeringArchitectureTests.cs`](../../../../sites/api.arolariu.ro/tests/arolariu.Backend.Domain.Tests/Invoices/Architecture/InvoiceUnifiedLayeringArchitectureTests.cs).

If the desired boundary is not already established, the task is an
architecture change rather than a refactor. Stop and ask.
