# Component Library Local Guide

Root `AGENTS.md` owns repository-wide versions, safety, React, TypeScript, testing, and Git rules. This file records only
`@arolariu/components` constraints.

## Boundaries

- `.github/instructions/components.instructions.md` owns the component-code rules, including domain independence, the `sites/**` import ban,
  `render`-only composition, the React 19 `ref` contract, `cn()` class composition, colocated CSS Modules, tests and stories, the
  `src/index.ts` export rule and `ACCESSIBILITY.md`.
- Do not add invoice, merchant, account, or other product business logic.

## File Shape

```text
src/components/ui/<name>.tsx
src/components/ui/<name>.module.css  # when the component owns visual styling
src/components/ui/<name>.test.tsx
src/components/ui/<name>.stories.tsx
src/index.ts
```

## Local Verification

Use the component-library build command owned by root `AGENTS.md`.

## Architecture References

- RFC 1006 - component-library architecture
- RFC 1008 - styling architecture
