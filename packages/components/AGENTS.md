# Component Library Local Guide

Root `AGENTS.md` owns repository-wide versions, safety, React, TypeScript, testing, and Git rules. This file records only
`@arolariu/components` constraints.

## Boundaries

- Components are domain-agnostic UI primitives.
- Do not import from `sites/**`.
- Do not add invoice, merchant, account, or other product business logic.
- Prefer Base UI composition and preserve accessibility behavior.

## File Shape

```text
src/components/ui/<name>.tsx
src/components/ui/<name>.module.css  # when the component owns visual styling
src/components/ui/<name>.test.tsx
src/components/ui/<name>.stories.tsx
src/index.ts
```

- Colocate implementation, test, Storybook story, and a CSS Module when the component owns visual styling. Intentional style-free
  composition primitives may omit the CSS file.
- Export every public component and public type from `src/index.ts`.
- Use `cn()` from `src/lib/utilities.ts` for class composition.
- Use Base UI `render` composition; do not restore removed `asChild` or legacy public adapters.
- The package is React 19-only. Receive a typed `ref` prop and preserve callback cleanup and object-ref ownership.
- Apply the component/consumer accessibility contract in `ACCESSIBILITY.md`; emulated tests do not establish full WCAG conformance.

## Local Verification

Use the component-library build command owned by root `AGENTS.md`.

## Architecture References

- RFC 1006 - component-library architecture
- RFC 1008 - styling architecture
