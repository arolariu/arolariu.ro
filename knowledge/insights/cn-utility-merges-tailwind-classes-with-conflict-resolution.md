---
description: "cn() combines clsx for conditional class logic with tailwind-merge for deduplication, preventing contradictory utilities like 'px-4 px-2' from both applying"
type: pattern
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# cn utility merges Tailwind classes with conflict resolution

The `cn()` function in `lib/utilities.ts` is the single class-merging utility used across all 70+ components. It composes two libraries: `clsx` handles conditional class logic (objects with boolean values, arrays, nested arrays, falsy filtering), and `tailwind-merge` resolves conflicts when two Tailwind utilities target the same CSS property. Without tailwind-merge, passing `className="px-2"` to a component that internally uses `px-4` would apply both padding values, producing unpredictable results. With it, the later value wins cleanly.

Every component passes its internal classes, cva variant output, and the consumer's `className` prop through `cn()`. This is what makes component styling truly overridable -- consumers can pass any Tailwind class and it will correctly replace rather than stack with the component's defaults. The pattern appears in the component template as `cn(buttonVariants({variant, size, className}))`, where the cva output and the consumer override merge in a single call.

The function is intentionally minimal (two lines) and lives in a shared `@/lib/utilities` path aliased across the package. Every component imports it, making it the most-imported utility in the entire library.

---

Related Insights:
- [[class-variance-authority-defines-component-variants-as-typed-tailwind-configurations]] -- foundation: cn() applies the class output that cva produces
- [[components-follow-four-step-structure-of-variants-props-forwardref-and-export]] -- enables: cn() is used inside every forwardRef body (step 3)

Domains:
- [[component-library]]
