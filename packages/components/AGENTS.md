# Component Library Agent Guide (@arolariu/components)

> Base UI + CSS Modules

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

- Use `cn()` for class merging (from `src/lib/utilities.ts`)
- Use `React.forwardRef` for components needing DOM refs
- Prefer Base UI `render` composition; keep `asChild` only for backward compatibility
- Use colocated CSS Modules for component styling
- NO imports from `sites/` — this is a shared library
- NO inline styles — CSS Modules only
- Accessibility-first: ARIA attributes, keyboard navigation

## File Structure

```text
src/components/ui/[name].tsx      — Component implementation
src/components/ui/[name].module.css — Component styles
src/components/ui/[name].stories.tsx — Storybook story (colocated)
src/index.ts                      — Barrel export (MUST update)
```

## RFC

Consult: 1006 (Component Library Architecture), 1008 (SCSS System Architecture)
