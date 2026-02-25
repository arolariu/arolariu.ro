---
description: "Every custom hook's @remarks must declare required context providers, external state mutations, and what causes re-execution — the three things callers cannot infer from the signature"
type: convention
source: "docs/rfc/1002-comprehensive-jsdoc-documentation-standard.md"
status: current
created: 2026-02-25
---

# Custom hooks document dependencies side effects and rerender triggers

Custom React hooks in this codebase follow a three-section `@remarks` template: **Dependencies** (what context providers or other hooks must be available), **Side Effects** (API calls, external state mutations, localStorage writes), and **Re-render Triggers** (what causes the hook to re-execute and potentially cause consumer re-renders). These three sections capture the information that is invisible in a hook's TypeScript signature but critical for correct usage.

The convention addresses a specific React pain point: hooks compose implicitly. When a component calls `useInvoice`, the TypeScript signature shows input and output types, but it cannot express that the hook requires `useUserInformation` to be available in the component tree, that it fetches data from an API on mount, or that changing `invoiceIdentifier` triggers a re-fetch. Without explicit documentation, developers discover these requirements through runtime errors or unexpected behavior.

This template parallels the server action documentation convention but targets a different kind of implicit boundary. Server actions cross the client-server boundary; hooks cross the rendering-lifecycle boundary. Both require documentation that makes invisible contracts visible, following the codebase's principle that JSDoc carries the semantic information that TypeScript types cannot.

---

Related Insights:
- [[server-actions-require-four-documented-sections-in-remarks]] — extends: both use structured @remarks templates for boundary-crossing abstractions
- [[every-react-component-jsdoc-must-declare-its-rendering-context]] — foundation: hooks are always client-side, but their consumer components need context awareness
- [[typescript-types-express-shape-while-jsdoc-expresses-intent-and-constraints]] — foundation: the hook template is a specific case of documenting what types cannot express

Domains:
- [[frontend-patterns]]
