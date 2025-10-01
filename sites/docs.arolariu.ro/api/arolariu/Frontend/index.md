---
uid: arolariu.Frontend
title: Frontend Namespace
---

# arolariu.Frontend

This section documents selected TypeScript / React frontend building blocks for the `arolariu.ro` application.
It complements the backend C# namespaces by exposing hooks, state stores, utility helpers, and server actions implemented in the Next.js codebase.

> [!NOTE]
> These pages are authored manually (conceptual Markdown) – DocFX is not (yet) configured to auto-extract TypeScript metadata.
> UIDs are provided so that future cross-references (`xref:`) can be added easily.

## Structure

| Category | Description | Examples |
| -------- | ----------- | -------- |
| Hooks | Reusable React state / behavior abstractions | `usePaginationWithSearch`, `useWindowSize`, `useZustandStore` |
| Utils | Pure functions & environment helpers (client/server) | `generateGuid`, `formatCurrency`, `createJwtToken` |
| Actions | Server actions (Next.js / “use server”) bridging UI and backend REST endpoints | `fetchInvoices` |

## Getting Started

Navigate via the left tree:
`API Documentation` > `arolariu` > `Frontend` > (`Hooks | Utils | Actions`)

## Cross-Namespace Considerations

- Backend DTOs / contracts may be consumed indirectly (e.g., `Invoice`, `Merchant` types) – those are defined in TypeScript type modules, not auto-listed here.
- Security-sensitive helpers (JWT creation, base64 handling) include caution notes.

## Expansion Roadmap

Planned future additions:
- Additional server actions (`fetchInvoice`, `uploadInvoice`, `analyzeInvoice`, etc.)
- Component-level patterns or higher-order UX hooks
- Performance profiling notes for heavy client utilities

## See Also

- Backend root: <xref:arolariu.Backend>
- Hooks overview: <xref:arolariu.Frontend.Hooks>
- Utils overview: <xref:arolariu.Frontend.Utils>
- Actions overview: <xref:arolariu.Frontend.Actions>

## Revision History

| Date (YYYY-MM-DD) | Change | Author |
| ----------------- | ------ | ------ |
| 2025-09-28 | Initial manual authoring of frontend namespace docs. | Alexandru-Razvan Olariu |
