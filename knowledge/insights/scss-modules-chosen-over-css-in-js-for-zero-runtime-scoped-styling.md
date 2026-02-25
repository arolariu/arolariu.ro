---
description: "CSS-in-JS rejected for runtime overhead and RSC incompatibility, vanilla-extract for build complexity, plain CSS Modules for missing SCSS power, BEM for unnecessary verbosity with automatic scoping"
type: decision
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# SCSS Modules chosen over CSS-in-JS for zero-runtime scoped styling

The frontend styling architecture evaluated six alternatives against requirements for scope isolation, full CSS power (variables, mixins, nesting, functions), theme support, and compatibility with React Server Components. CSS-in-JS libraries like Emotion and Styled Components were rejected because they inject styles at runtime, adding bundle weight and creating hydration mismatches with RSC. vanilla-extract offered compile-time extraction but introduced significant build complexity and a steeper learning curve with less ecosystem support. Plain CSS Modules provided scoping but lacked SCSS features like mixins, functions, and nesting that enable DRY responsive design code. Using SCSS without Modules would lose the automatic class name scoping that prevents collisions across a growing component tree.

SCSS Modules combine the full power of Dart Sass (variables, nesting, mixins, functions, `@use`/`@forward` module system) with CSS Modules' deterministic class name hashing. Next.js supports this combination natively with zero configuration -- `.module.scss` files are compiled by Dart Sass and then processed by CSS Modules, producing unique class names at build time with no runtime JavaScript. This means Server Components can reference SCSS Module classes without any client-side style injection.

The trade-off is maintaining two styling systems during the migration period from Tailwind, and the lack of TypeScript autocomplete for class names (a minor ergonomic gap compared to typed CSS-in-JS solutions).

---

Related Insights:
- [[base-styles-import-required-once-at-app-entry-point]] -- foundation: SCSS Modules reference the same CSS custom properties that the component library defines
- [[cn-utility-merges-tailwind-classes-with-conflict-resolution]] -- coexists: cn() handles Tailwind merging while SCSS Modules handle page-level styling

Domains:
- [[frontend-patterns]]
