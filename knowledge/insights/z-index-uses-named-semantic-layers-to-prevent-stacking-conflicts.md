---
description: "Nine named layers from base(0) through toast(1080) accessed via z() function; prevents magic z-index values that create unpredictable stacking across components"
type: convention
source: "docs/rfc/1008-scss-system-architecture.md"
status: current
created: 2026-02-25
---

# Z-index uses named semantic layers to prevent stacking conflicts

The SCSS system defines a `$z-index` map with nine named layers -- `base` (0), `dropdown` (1000), `sticky` (1020), `fixed` (1030), `modal-backdrop` (1040), `modal` (1050), `popover` (1060), `tooltip` (1070), and `toast` (1080) -- accessed through the `z()` helper function. Writing `z-index: z('modal')` instead of `z-index: 1050` prevents the classic CSS problem where developers invent arbitrary z-index values that conflict across components.

The layer ordering follows a logical stacking hierarchy: dropdowns sit below sticky navigation, modals overlay everything except tooltips and toasts, and toasts always appear at the highest layer for critical user feedback. Each layer has a 10-20 point gap between values, leaving room for edge cases without restructuring the scale. The `z()` function validates the key at compile time, so `z('overlay')` would halt the build with an error listing valid layer names.

This approach is complementary to CSS Modules' scoping. While CSS Modules isolate class names, z-index operates in a global stacking context. Named layers ensure that independently developed components stack predictably when composed on the same page, even though their styles are otherwise isolated.

---

Related Insights:
- [[scss-helper-functions-with-error-messages-enforce-valid-token-access]] -- foundation: z() is one of the compile-time validated helper functions
- [[css-module-classes-use-semantic-camelcase-not-bem-because-scoping-is-automatic]] -- context: z-index is the one CSS property where scoping alone does not prevent conflicts

Domains:
- [[frontend-patterns]]
