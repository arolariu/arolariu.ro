---
description: "Every component file: (1) cva variant definition, (2) props interface extending HTML attrs + VariantProps, (3) React.forwardRef with cn(), (4) named exports with displayName"
type: convention
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# Components follow four-step structure of variants props forwardRef and export

The library enforces a consistent internal structure for every component file. Step one defines the visual variants using `cva()` with base classes, variant options, and defaults. Step two declares a props interface that extends the native HTML element attributes (e.g., `React.ButtonHTMLAttributes<HTMLButtonElement>`) and intersects with `VariantProps<typeof variants>` so variant props are typed automatically. Step three implements the component as a `React.forwardRef` call where the render function destructures variant props, spreads remaining HTML attributes, and applies classes through `cn()`. Step four exports both the component and its variants object, and sets `Component.displayName` for React DevTools.

This four-step pattern is not a suggestion -- it is the canonical structure that every component follows. The `displayName` assignment is required because `forwardRef` creates anonymous components in DevTools otherwise. The variants export (alongside the component) enables consumers to reuse variant styles on arbitrary elements, which is useful for composition patterns where a non-component element needs to match the visual style.

The interface extension from native HTML attributes ensures that every component accepts standard DOM props (className, id, aria-*, data-*) without redeclaring them, while the `Readonly<Props>` pattern from the broader codebase conventions applies to the props type.

---

Related Insights:
- [[class-variance-authority-defines-component-variants-as-typed-tailwind-configurations]] -- foundation: step 1 of the pattern
- [[cn-utility-merges-tailwind-classes-with-conflict-resolution]] -- foundation: used in step 3
- [[aschild-prop-enables-polymorphic-rendering-via-radix-slot]] -- extends: some components add asChild to step 2

Domains:
- [[component-library]]
