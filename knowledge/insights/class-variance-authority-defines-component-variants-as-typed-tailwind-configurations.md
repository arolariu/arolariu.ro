---
description: "cva() maps variant names to Tailwind class sets with defaultVariants, and VariantProps extracts the type union for component props automatically"
type: convention
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# Class-variance-authority defines component variants as typed Tailwind configurations

Every component in the library that supports visual variants (Button, Badge, Alert, etc.) declares them through `cva()` from class-variance-authority. The `cva()` call takes a base class string and a variants object where each key (like `variant` or `size`) maps to named options with their Tailwind class lists. A `defaultVariants` block specifies which option applies when no prop is passed.

The TypeScript integration is the critical part: `VariantProps<typeof buttonVariants>` extracts a type union from the cva definition, so the component's props interface automatically knows that `variant` accepts `"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"` and `size` accepts `"default" | "sm" | "lg" | "icon"`. Adding a new variant option to the cva definition immediately updates the type -- no manual interface maintenance.

This pattern standardizes how every component relates its visual states to its props. Developers never write raw conditional Tailwind logic in component bodies. Instead, the cva configuration is the single source of truth for what variants exist, what they look like, and what their defaults are. The `buttonVariants` export (alongside the `Button` component) also enables consumers to apply the same variant styles to non-Button elements when needed.

---

Related Insights:
- [[components-follow-four-step-structure-of-variants-props-forwardref-and-export]] -- foundation: cva is step 1 of the four-step pattern
- [[cn-utility-merges-tailwind-classes-with-conflict-resolution]] -- enables: cn() applies the cva output merged with consumer overrides
- [[radix-ui-primitives-provide-accessibility-foundation-for-all-interactive-components]] -- foundation: cva layers styling on Radix behavior

Domains:
- [[component-library]]
