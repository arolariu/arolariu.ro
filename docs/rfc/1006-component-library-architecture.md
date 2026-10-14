# RFC 1006: Component Library Architecture

- **Status**: Implemented
- **Date**: 2025-12-25
- **Authors**: Alexandru-Razvan Olariu
- **Related Components**: `packages/components/`, `@arolariu/components`

---

## Abstract

`@arolariu/components` is the repository's domain-agnostic React component library. It wraps Base UI primitives where appropriate, uses
colocated CSS Modules and `--ac-*` design tokens, publishes ESM plus TypeScript declarations, and exposes supported components/types through
the package entry points.

Live source, `package.json`, `rslib.config.ts`, tests, stories, and exports are authoritative. Component counts and package versions are
intentionally not copied into this RFC.

## Goals

- Accessible native/Base UI interaction semantics.
- Domain-independent APIs reusable outside the main website.
- Strict TypeScript contracts and explicit public types.
- Colocated implementation, tests, Storybook stories, and styles when the component owns visual presentation.
- Tree-shakeable ESM output with CSS side effects declared.
- Stable package exports and source maps.
- Themeable CSS custom properties without application-specific styling.

## Ownership boundary

The library may contain:

- reusable controls, overlays, navigation, forms, feedback, data display, and visual primitives;
- generic composition/ref/accessibility utilities;
- package-owned design tokens and motion primitives.

It must not contain:

- invoice, merchant, account, route, Clerk, API, or product policy;
- website messages or navigation;
- server data access or Server Actions;
- application state stores;
- imports from `sites/**`.

The website composes domain behavior and localized copy around these primitives.

## File shape

```text
packages/components/
├── src/
│   ├── components/ui/
│   │   ├── <name>.tsx
│   │   ├── <name>.module.css   # when visual styling is owned here
│   │   ├── <name>.test.tsx
│   │   └── <name>.stories.tsx
│   ├── hooks/
│   ├── lib/
│   ├── motion/
│   ├── index.ts
│   └── index.css
├── rslib.config.ts
└── package.json
```

The live public inventory is `src/index.ts`, the package export map, and `src/components/ui/`. Do not maintain a second counted component
list.

## Base UI composition

Interactive wrappers prefer Base UI's `useRender` and `mergeProps` pattern. Preserve:

- native element behavior by default;
- Base UI state/data attributes;
- merged event/ref/ARIA behavior;
- forwarded DOM refs where the public contract requires them;
- current `render` composition.

`asChild` remains only for compatible existing APIs. New APIs should use the preferred Base UI composition surface rather than expanding the
compatibility shim.

When a component can use a native element directly, preserve its native keyboard, focus, form, and disabled semantics. A composed non-native
control must provide the equivalent role, keyboard behavior, `aria-disabled`, and activation suppression.

## Props and exports

- Props are precise and readonly at component boundaries.
- Export supported component props and public types from `src/index.ts`.
- Keep type-only imports type-only.
- Preserve package subpath imports generated from the build/export configuration.
- Do not expose an internal helper solely to simplify one website consumer.
- Do not use explicit `any` or casts to hide composition/type incompatibility.

Root exports are explicit, not wildcard aggregations across component families. Preserve actual runtime/type/namespace identity. Resolve
collisions deliberately: the field component is `FieldError`, RHF's type is `RHFFieldError`, the native label is `Label`, and the chart
label is `RechartsLabel`. Canonical Toast is a component; its notification data is `ToastData`/`ToastObject`. Canonical Toaster and explicit
LegacyToaster are not aliases for one another. DirectionProvider and useDirection retain the original Base UI context with TextDirection.

Underscore-prefixed modules/directories are private. Build output may retain them as transitive implementation modules, but the export
generator must not advertise them. Retained nested wildcard routes must also block private helper imports. Root/public-subpath tests use
real modules and declaration symbols, never replacement repository or primitive implementations.

A new public component includes implementation, focused tests, Storybook story, intentional barrel/package exposure, and a CSS Module when
it owns visual styling. A style-free composition primitive may intentionally omit one.

## Styling

Components that own visual presentation use a colocated CSS Module. Style-free composition primitives may rely entirely on their children.
Shared package tokens live in `src/index.css` under the `--ac-*` namespace.

- Use classes, data attributes, and CSS variables rather than inline style objects.
- Preserve focus-visible, disabled, open/closed, selected/checked, reduced motion, forced-colors, and theme behavior.
- Use the package `cn()` helper for class composition.
- Keep website/domain styles outside the package.
- Mark CSS as a package side effect so bundlers retain imported component styles.

## Accessibility

Accessibility is observable behavior:

- choose native semantics before ARIA;
- preserve accessible name, role, value, description, and state;
- support keyboard/pointer parity;
- manage focus entry, containment, return, and recovery for overlays;
- announce loading/errors/status through appropriate live semantics;
- honor reduced motion and forced colors;
- keep disabled composed controls non-activatable.

Base UI provides primitives, not proof. Tests and stories must exercise the wrapper's actual public behavior.

## Client and server compatibility

Components without Hooks, handlers, browser APIs, or client Context can remain server-compatible. Add `"use client"` only to the smallest
module that requires client execution.

A directive-free component imported beneath a client boundary must still be client-safe. Conversely, a server-compatible package primitive
must not import `server-only` code or application configuration.

## Build and package contract

`package.json` and `rslib.config.ts` own:

- package version and dependency/peer ranges;
- ESM/type/style outputs;
- export map and type versions;
- CSS side effects;
- publish files and package metadata.

Do not copy those values into this RFC. Dependency/version changes use the approved dependency-update workflow and must preserve React/Base
UI peer compatibility.

The publishing workflow builds, tests, and publishes with provenance through the repository's approved GitHub Actions/OIDC path.

### Website consumption boundary

The library remains an npm workspace and Nx project, while the website consumes a published registry artifact rather than the local
workspace's source or build output. The website manifest pins the official npm tarball; the shared root lockfile pins its integrity and
installs the website's separate copy.

An ordinary semver dependency or npm alias can be linked to a matching local workspace, so those declarations do not establish this
boundary. The explicit registry artifact avoids that implicit link. Website build/dev targets, test resolution, and container builders must
not require local component compilation. Library tests, Storybook, and release builds continue to validate the workspace independently.

Shared API/type/docs/contract-test preparation may proceed under an explicit controller ruling while scoped producer corrections continue.
That ruling is not evidence that all producer gates passed. Root dependency restoration/lock evidence must remain intact until the
integration controller releases the next phase. Source typing and focused Vitest are not substitutes for the actual built/packed
ESM/declaration/CSS/client-boundary contract.

Publishing a new library version and adopting it in the website are separate operations. A website upgrade must reference an already
published artifact. The shared lock domain still couples dependency installation and cache invalidation; it does not couple the website to
local library implementation.

## Testing and stories

Colocated Vitest and Testing Library tests should cover the public interaction:

- role/name and native/composed behavior;
- keyboard, pointer, focus, disabled, and loading/error states;
- controlled/uncontrolled value behavior where supported;
- ref forwarding and composition;
- cleanup for overlays/listeners/timers;
- CSS/data-state contract only when it is public behavior.

Do not replace the component or Base UI behavior being asserted with a repository mock. Storybook stories provide interactive documentation
and visual/a11y scenarios but do not replace focused tests.

### Final post-wave validation checkpoint — 2026-10-14

The parent verified the component workspace with `AROLARIU_COMPONENTS_PACKED_ROOT` set to the actual extracted npm artifact:

```bash
npm run test:unit --workspace=@arolariu/components -- --maxWorkers=2 --reporter=dot
```

Exit **0**: **126 files / 3,043 tests / no skips**, including all three actual packed ESM/type/subpath contracts. Start **10:50:17 local**,
duration **333.64 seconds**. Coverage: statements **98.35% (3769/3832)**, branches **95.32% (2997/3144)**, functions **99.41% (1025/1031)**,
lines **99.25% (3573/3600)**. Existing 80% branch / 95% function-line-statement thresholds and exclusions were unchanged.
Component/Storybook builds and the isolated 18-fixture React 18 packed lane are separately verified.

Final scoped review (`a3e8b0b6`) found I1/I2 and M1–M10 all addressed, zero remaining and zero new Important regressions. Parent-reported
configured ESLint and Prettier for all **383 changed files** passed; the direct React18 source lane also passed **18 fixtures**. Expected
Motion reduced notices/npm configuration warnings remain visible; fixture-only corrections removed React Tabs act warnings without changing
production/dist. This dated component checkpoint does not clear the known 15 hook/story strong-type baseline, website
fixture/build-environment blocks, physical-browser limits or publication/adoption gates.

## Migration boundary

The current architecture uses Base UI rather than Radix packages and CSS Modules rather than Tailwind-based component implementation. The
former `sonner` wrapper is not a current public component; use the live toast surface.

Historical compatibility such as `asChild` must not be propagated to new APIs without a demonstrated consumer requirement.

Canonical and compatibility behavior must be separately named and documented. Canonical toast is the Base UI manager/compound surface;
facade behavior is legacyToast/LegacyToaster. Canonical CommandDialog is a modal shell requiring one explicit native Command root;
LegacyCommandDialog supplies the former automatic root and must not receive a nested root. Canonical AlertDialogAction does not close;
LegacyAlertDialogAction immediately dismisses without awaiting asynchronous work. Do not silently expose these adapters under canonical
names.

Ship MIGRATION alongside README/EXAMPLES/CHANGELOG. Preserve historical guides and add version-scoped sections for newly breaking defaults,
DOM refs/tags, values/nullability, render ownership, primitive callback details and explicit error policies. Document retained local
extensions, deliberate no-ops and unselected optional families. Keep native focus/inert, physical gesture/paint, scroll-anchoring and
screen-reader limits separate from emulated passing tests. Source React-floor evidence and actual packed React-floor evidence are distinct.

## Trade-offs

- Wrapping Base UI provides consistent package APIs and styling but requires preserving merged primitive behavior.
- CSS Modules avoid runtime styling dependencies but make class/data-state contracts part of component implementation.
- A broad component inventory increases maintenance; domain independence and complete colocated assets are required to justify new public
  surface.

## References

- `packages/components/AGENTS.md`
- `packages/components/src/index.ts`
- `packages/components/src/index.css`
- `packages/components/src/components/ui/`
- `packages/components/src/lib/utilities.ts`
- `packages/components/package.json`
- `packages/components/rslib.config.ts`
- [Base UI](https://base-ui.com/)
