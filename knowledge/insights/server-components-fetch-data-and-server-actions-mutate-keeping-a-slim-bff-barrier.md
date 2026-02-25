---
description: "RSC handles reads (data fetching at render time), Server Actions handle writes (mutations forwarded to .NET API), creating a thin typed boundary"
type: convention
source: "owner knowledge"
status: current
created: 2026-02-25
---

# Server Components fetch data and Server Actions mutate keeping a slim BFF barrier

The frontend-backend boundary should be as thin as possible. React Server Components handle the read path — fetching data at render time from the .NET API, transforming it for UI consumption, and passing it to client islands as props. Server Actions (React Server Functions) handle the write path — accepting form data or structured payloads from client components, forwarding mutations to the .NET API, and returning typed results.

This two-channel design (RSC for reads, Server Actions for writes) means the BFF layer stays slim rather than accumulating business logic. On the write path, Server Actions forward mutations to the .NET API where [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]], ensuring every mutation traverses the full Standard layer hierarchy with its validation and telemetry guarantees. Since [[nextjs-serves-as-backend-for-frontend-bridging-react-ui-and-dotnet-api]], the temptation is to put validation, transformation, and orchestration logic in the Next.js layer. The slim-barrier convention resists this: the BFF should only handle concerns that are genuinely frontend-specific (auth context, locale resolution, UI-specific data shaping). Domain logic belongs in the .NET API's Standard layers.

The practical test: if removing the Next.js layer would require duplicating the logic elsewhere, it belongs in the API. If it's only needed for rendering or client interaction, it belongs in the BFF. One current limitation: since [[all-service-exceptions-currently-map-to-500-status-missing-proper-http-differentiation]], the write path cannot distinguish between user validation errors and infrastructure failures from the API response alone, undermining the semantic error feedback the client islands need.

---

Related Insights:
- [[nextjs-serves-as-backend-for-frontend-bridging-react-ui-and-dotnet-api]] — foundation: the BFF architecture this convention keeps slim
- [[server-action-results-use-discriminated-unions-instead-of-exceptions]] — extends: the typed result pattern for the write path
- [[server-actions-wrap-api-calls-in-opentelemetry-spans-for-tracing]] — extends: observability on the mutation path
- [[server-data-merges-into-zustand-store-after-hydration-completes]] — extends: how RSC-fetched data reaches client state
- [[observability-separates-auto-instrumentation-from-manual-business-spans]] — enables: the BFF boundary is where manual spans add value
- [[endpoints-expose-only-processing-services-following-the-standard-exposer-pattern]] — foundation: write path terminates at Processing endpoints in the Standard hierarchy
- [[http-status-codes-map-to-semantic-error-codes-for-ui-consumption]] — extends: write path uses semantic error code mapping to translate API responses
- [[all-service-exceptions-currently-map-to-500-status-missing-proper-http-differentiation]] — tension: backend 500-for-everything degrades the write path's error reporting

Domains:
- [[frontend-patterns]]
- [[cross-cutting]]
