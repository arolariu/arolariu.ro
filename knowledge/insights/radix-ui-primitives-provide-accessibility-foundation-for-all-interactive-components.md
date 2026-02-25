---
description: "Radix chosen over MUI, Chakra, Headless UI, and Ant Design for unstyled primitives with battle-tested WCAG 2.1 AA compliance and React 19 support"
type: decision
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# Radix UI primitives provide accessibility foundation for all interactive components

Every interactive component in @arolariu/components is built on a Radix UI primitive rather than implementing accessibility behavior from scratch. This means Dialog gets focus trapping and `aria-modal` for free, Select inherits keyboard navigation and `aria-expanded`, Tabs respond to arrow keys with proper `aria-selected` and `aria-controls` relationships. The library delegates all accessibility machinery to Radix and layers only styling and variant logic on top.

The decision rejected several alternatives. Material UI and Ant Design were too opinionated in their visual design and shipped large bundles. Chakra UI used runtime CSS-in-JS that conflicts with Next.js Server Components. Headless UI lacked the breadth of primitives needed (70+ components). The shadcn copy-paste approach gave no package versioning, making coordinated updates across consumers impossible.

Radix's key advantage is that its primitives are unstyled -- they provide behavioral scaffolding (keyboard handling, ARIA attributes, focus management, color-contrast-ready markup) without imposing visual opinions. This lets Tailwind CSS handle all styling through the `cn()` utility and `cva()` variants, keeping the component library fully customizable while guaranteeing WCAG 2.1 AA compliance as a baseline, not an afterthought.

---

Related Insights:
- [[class-variance-authority-defines-component-variants-as-typed-tailwind-configurations]] -- enables: cva sits on top of the Radix behavior layer
- [[cn-utility-merges-tailwind-classes-with-conflict-resolution]] -- enables: Tailwind class merging makes Radix styling practical
- [[component-library-provides-client-side-primitives-consumed-by-island-pattern]] -- extends: Radix components are inherently client-side

Domains:
- [[component-library]]
