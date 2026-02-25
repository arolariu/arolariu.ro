---
description: "package.json declares sideEffects:false so bundlers can safely eliminate unused component modules; CSS is isolated to a separate export path to preserve this guarantee"
type: decision
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# sideEffects false enables aggressive tree-shaking across 70-plus components

The `@arolariu/components` package.json sets `"sideEffects": false`, signaling to bundlers (webpack, Next.js, Vite) that any module from the package can be safely dropped if nothing imports its exports. For a library with 70+ components, this is critical -- without it, importing a single Button could pull the entire component graph into the bundle because bundlers would assume any module might have import-time side effects (global mutations, CSS injections, polyfills).

The CSS base styles are the one genuine side effect in the package, but they are isolated behind a dedicated `"./styles"` export path rather than being imported by component modules themselves. This architecture lets the JavaScript remain truly side-effect-free while the CSS side effect is explicitly opted into by the consumer via `import "@arolariu/components/styles"`. If CSS were imported inside component files, the `sideEffects: false` declaration would be a lie, and bundlers would either break styles or ignore the optimization.

Combined with the unbundled ESM output from RSLib (`bundle: false`), this creates a two-layer tree-shaking strategy: the unbundled output lets bundlers resolve per-file, and `sideEffects: false` gives them permission to drop files entirely. Peer dependencies on React 18/19 further reduce the shipped payload by deferring React itself to the consumer's bundle.

---

Related Insights:
- [[rslib-bundles-components-as-unbundled-esm-for-per-file-tree-shaking]] -- foundation: unbundled ESM is the first layer of the tree-shaking strategy
- [[base-styles-import-required-once-at-app-entry-point]] -- extends: CSS isolation preserves the sideEffects:false guarantee
- [[direct-component-imports-preferred-over-barrel-imports-for-bundle-size]] -- extends: per-component imports maximize what sideEffects:false can eliminate

Domains:
- [[component-library]]
