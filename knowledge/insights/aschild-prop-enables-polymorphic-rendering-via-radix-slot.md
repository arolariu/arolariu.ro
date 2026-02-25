---
description: "When asChild is true, the component renders its child element instead of its default HTML tag using Radix Slot, enabling composition without wrapper divs"
type: pattern
source: "docs/rfc/1006-component-library-architecture.md"
status: current
created: 2026-02-25
---

# asChild prop enables polymorphic rendering via Radix Slot

Components that need polymorphic rendering (rendering as a different element than their default) use the `asChild` boolean prop backed by Radix's `Slot` component. When `asChild` is false (the default), Button renders a `<button>` element. When `asChild` is true, Button renders its child element instead, merging all of Button's props (className, event handlers, ARIA attributes) onto that child. This lets a Button render as an anchor tag, a Next.js Link, or any other component without wrapper elements.

The implementation swaps the root element: `const Comp = asChild ? Slot : "button"`. Radix Slot handles the prop merging -- it takes the component's props and forwards them onto the single child element, combining classNames, composing event handlers, and merging refs. This avoids the legacy `as` prop pattern (e.g., `<Button as="a">`) which has well-documented TypeScript inference problems and creates ambiguous prop types.

The `asChild` pattern is particularly useful in the Next.js context where buttons that navigate need to be `<Link>` elements for client-side routing. Instead of duplicating styling between Button and a styled Link, consumers write `<Button asChild><Link href="/path">Navigate</Link></Button>` and get Button's visual treatment with Link's routing behavior. The pattern preserves the component's accessibility guarantees because Slot forwards all ARIA attributes to the underlying element.

---

Related Insights:
- [[radix-ui-primitives-provide-accessibility-foundation-for-all-interactive-components]] -- foundation: Slot is a Radix primitive that preserves a11y during composition
- [[components-follow-four-step-structure-of-variants-props-forwardref-and-export]] -- extends: asChild is declared in step 2 (props interface) and used in step 3 (render)
- [[component-library-provides-client-side-primitives-consumed-by-island-pattern]] -- extends: asChild with Next.js Link bridges component library and routing

Domains:
- [[component-library]]
- [[frontend-patterns]]
