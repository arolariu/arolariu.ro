# Component Library Agent Guide (@arolariu/components)

> Radix UI + shadcn/ui + Tailwind CSS

## Architecture

- Domain-agnostic UI primitives — NO business logic
- Every component exported through `src/index.ts` barrel
- Storybook stories required for new public components

## Commands

```bash
npm run build:components    # Build with RSLib
npm run dev:components      # Storybook → http://localhost:6006
```

## Rules

- Use `cn()` for class merging (from `src/lib/utils.ts`)
- Use `React.forwardRef` for components needing DOM refs
- Use `cva` (class-variance-authority) for variant patterns
- NO imports from `sites/` — this is a shared library
- NO inline styles — Tailwind only
- Accessibility-first: ARIA attributes, keyboard navigation

## File Structure

```
src/components/ui/[name].tsx  — Component implementation
stories/[name].stories.tsx    — Storybook story
src/index.ts                  — Barrel export (MUST update)
```

## RFC

Consult: 1006 (Component Library Architecture)
