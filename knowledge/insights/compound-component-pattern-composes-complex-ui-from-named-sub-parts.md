---
description: "Card, Dialog, Sidebar and similar components export named sub-parts (CardHeader, CardTitle, etc.) that compose into a declarative tree structure"
type: pattern
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# Compound component pattern composes complex UI from named sub-parts

Complex components in the library decompose into named sub-components that compose declaratively as a tree. Card exports Card, CardHeader, CardTitle, CardDescription, CardContent, and CardFooter. Dialog exports Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, and DialogFooter. Each sub-component handles one slot in the layout, and consumers assemble them to control what appears where.

This pattern trades a single props-heavy component (the "mega-prop" anti-pattern where Card takes `title`, `description`, `headerSlot`, `footerSlot` as props) for composable pieces that read like a document outline. The consumer controls structure -- if no footer is needed, CardFooter is simply not rendered. There is no `showFooter={false}` prop to manage.

All sub-parts of a compound component are exported from the same module path, so `import { Card, CardHeader, CardContent } from "@arolariu/components/card"` pulls only what is needed. This aligns with the Radix UI conventions where primitives like Dialog.Root, Dialog.Trigger, and Dialog.Content follow the same compositional philosophy. The library's compound components extend this pattern from Radix's behavioral layer into the styled layer.

---

Related Insights:
- [[direct-component-imports-preferred-over-barrel-imports-for-bundle-size]] -- foundation: compound sub-parts share one import path
- [[radix-ui-primitives-provide-accessibility-foundation-for-all-interactive-components]] -- foundation: Radix uses the same compound pattern for its primitives
- [[components-follow-four-step-structure-of-variants-props-forwardref-and-export]] -- extends: each sub-part follows the four-step structure individually

Domains:
- [[component-library]]
