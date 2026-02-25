---
description: "RSC handles reads (data fetching at render time), Server Actions handle writes (mutations forwarded to .NET API), creating a thin typed boundary"
type: convention
source: "owner knowledge"
status: current
created: 2026-02-25
---

# Server Components fetch data and Server Actions mutate keeping a slim BFF barrier

The frontend-backend boundary should be as thin as possible. React Server Components handle the read path — fetching data at render time from the .NET API, transforming it for UI consumption, and passing it to client islands as props. Server Actions (React Server Functions) handle the write path — accepting form data or structured payloads from client components, forwarding mutations to the .NET API, and returning typed results.

This two-channel design (RSC for reads, Server Actions for writes) means the BFF layer stays slim rather than accumulating business logic. Since [[nextjs-serves-as-backend-for-frontend-bridging-react-ui-and-dotnet-api]], the temptation is to put validation, transformation, and orchestration logic in the Next.js layer. The slim-barrier convention resists this: the BFF should only handle concerns that are genuinely frontend-specific (auth context, locale resolution, UI-specific data shaping). Domain logic belongs in the .NET API's Standard layers.

The practical test: if removing the Next.js layer would require duplicating the logic elsewhere, it belongs in the API. If it's only needed for rendering or client interaction, it belongs in the BFF.

---

Related Insights:
- [[nextjs-serves-as-backend-for-frontend-bridging-react-ui-and-dotnet-api]] — foundation: the BFF architecture this convention keeps slim
- [[server-action-results-use-discriminated-unions-instead-of-exceptions]] — extends: the typed result pattern for the write path
- [[server-actions-wrap-api-calls-in-opentelemetry-spans-for-tracing]] — extends: observability on the mutation path
- [[server-data-merges-into-zustand-store-after-hydration-completes]] — extends: how RSC-fetched data reaches client state
- [[observability-separates-auto-instrumentation-from-manual-business-spans]] — enables: the BFF boundary is where manual spans add value

Domains:
- [[frontend-patterns]]
- [[cross-cutting]]
