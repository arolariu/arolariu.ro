# Accessibility contract

The component library targets the applicable WCAG 2.2 Level A and AA success criteria. This is an implementation target, **not a
certification or a full-page conformance claim**. [WCAG conformance](https://www.w3.org/WAI/WCAG22/Understanding/conformance) applies to
complete pages and processes, including their content, composition, themes and responsive states.

## Responsibility boundaries

The library owns native semantics, primitive state, DOM ref composition, default styles, keyboard behavior, focus management and its
generated controls. Applications own meaningful localized content, labels, alternative text, logical headings, chart descriptions, document
landmarks and any overrides to component semantics or design tokens.

Use visible labels when possible. Give icon-only actions an action-specific accessible name. Button's icon sizes (`icon`, `icon-xs`,
`icon-sm`, `icon-lg`) require a string `aria-label` or `aria-labelledby` in their types, so visible or visually hidden text alone does not
satisfy them; other icon-only controls can be named with `aria-label`, `aria-labelledby` or visually hidden text. Preserve all supplied DOM
props and `ref` in custom `render` targets. Navigation stays a native link: style an `<a href>` with `buttonVariants()` instead of rendering
it through `Button`, which would announce it as a button, drop it from the page's links and activate it on Space. Do not replace a real
button with a generic element unless its complete keyboard, focus and disabled contract is retained; set `nativeButton={false}` only for
non-link targets that take button semantics, such as a `<div>`.

Remaining native/ARIA/data props are applied after library presets as an intentional escape hatch; explicit `undefined` can remove an
optional default attribute. Consumed classes, refs and cancellable handlers remain composed. Overriding roles, names, visibility, state
markers or focus attributes transfers responsibility for the resulting semantics and interactions to the application; the default component
evidence does not establish conformance for those overrides.

Do not hide interactive or meaningful descendants with `aria-hidden`. Decorative icons, canvases and duplicate animated text can be hidden
only when their meaning is otherwise available. Table headings, input errors and overlay descriptions must stay associated with the content
they describe.

Some component defaults leave a specific obligation with the application:

- Announce loading and other status changes through a live region that is mounted before the change and then receives text: LoadingOverlay's
  `loadingLabel`, AsyncBoundary's default fallback, `useAnnounce` or a persistent `VisuallyHidden role="status"`. A status element inserted
  already populated, an accessible name alone (such as Spinner's) or `aria-busy` on the region itself is not a reliable announcement.
- FocusScope's `contain` (on by default) has no built-in exit: provide and announce a keyboard exit, such as an Escape handler or a
  reachable Done control.
- With vertical Drawer `snapPoints`, include a snap point tall enough to show every focusable control or keep focusable controls within the
  smallest snap height; controlled snap points must apply or cancel Drawer's focus-driven expansion request.
- Set accordion heading levels with AccordionTrigger's `headerProps.render` so they continue the page outline.
- Mark only real destinations as current: Sidebar `isActive` sets `aria-current="page"`, so pass `aria-current={undefined}` to section or
  disclosure triggers that only show active styling.

## Required criteria and evidence

| Area                   | Applicable criteria                                    | Component evidence                                                                    | Application/browser evidence                                                         |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Meaning and structure  | 1.1.1, 1.3.1, 1.3.2                                    | Native elements, relationships, meaningful versus decorative content                  | Appropriate alt text, chart alternatives, headings, reading order                    |
| Controls and forms     | 2.1.1, 2.1.2, 2.5.3, 3.2.1, 3.2.2, 3.3.1, 3.3.2, 4.1.2 | Names, roles, values, keyboard activation, disabled controls, labels and error IDREFs | Localized instructions, visible-label/name agreement, real form workflow             |
| Focus and overlays     | 2.4.3, 2.4.7, 2.4.11                                   | Entry, containment, return, cancellation, dismissal and cleanup                       | Native focus/inert behavior, sticky content, portals and clipping                    |
| Hover/focus content    | 1.4.13                                                 | Tooltip/popover visibility, dismissal and trigger relationships                       | Dismissible, hoverable and persistent content at real pointer positions              |
| Status and timing      | 2.2.1, 2.2.2, 4.1.3                                    | Busy/status/error semantics and user-owned notification timing                        | Actual assistive announcements, enough reading time, pause/extension controls        |
| Color and presentation | 1.4.1, 1.4.3, 1.4.11                                   | Default opaque token pairs and non-color state indicators                             | Composited pixels, all hover/selected/error states, custom themes, forced colors     |
| Reflow and text        | 1.4.4, 1.4.10, 1.4.12                                  | Flexible component layout and content wrapping                                        | 200% text resize, 320 CSS-pixel reflow, text-spacing overrides and long translations |
| Pointer and dragging   | 2.5.1, 2.5.2, 2.5.7, 2.5.8                             | Keyboard/single-pointer alternatives and ordinary control target styles               | Actual hit regions, spacing, dragging alternatives and touch cancellation            |
| Motion and flashing    | 2.2.2, 2.3.1                                           | Static reduced-motion alternatives, bounded/controllable motion and timer disposal    | Actual flashing thresholds, continued-motion controls and rendered transitions       |

The applicable minimum target is
[24 by 24 CSS pixels, subject to the criterion's exceptions](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
Forty-four pixels is a useful stronger target, not the universal AA minimum. The hit region, not just an icon's visible dimensions,
determines target size. A small target's spacing exception must be checked in its actual composition, not inferred from isolated CSS.

Ordinary text needs at least 4.5:1 contrast; qualifying large text needs 3:1. Essential control/state/focus visuals need 3:1 against their
relevant adjacent colors. Disabled and purely decorative elements have criterion-specific exceptions. Do not treat every decorative border
as an essential control boundary.

## Motion and timed content

Reduced motion preserves content and state without relying on animation. It does not, by itself, satisfy
[Pause, Stop, Hide](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html). Nonessential automatic motion lasting more than five
seconds alongside other content needs a user-operable pause, stop or hide mechanism. Intentional continuing motion must provide that
mechanism in the consuming composition. Do not offer an inaccessible pointer-only pause. The library's visual effects settle their automatic
motion five seconds after mount; `loop` removes that limit and requires a localized, native control that sets `motionPaused`.

Toast and carousel applications must choose appropriate reading time and user controls. Toasts persist until closed unless `timeout` is set,
because it defaults to `0`. Hover/focus pausing alone does not establish that every user can extend or disable a time limit. Critical
instructions, errors and required actions must not exist only in an automatically disappearing notification.

## Verification boundary

Colocated Vitest/Testing Library tests exercise the real components and primitives, including names/roles, public keyboard interactions, ref
disposal, cancellation and state transitions. Source and genuinely packed declaration/export contracts exercise the supported React 19 API.
No React 18 compatibility lane or Playwright runner is part of this package.

`src/styles.test.ts` checks the default opaque OKLCH token pairs against WCAG thresholds using clipped linear-sRGB luminance. It cannot
validate browser gamut mapping, transparency, shadows, overlays, consumer token overrides or actual adjacent pixels.

Storybook includes the existing accessibility addon for inspecting composed examples. Neither its automated results nor Happy DOM tests
establish native-browser, screen-reader or full WCAG conformance. Before release, evaluate representative compositions in both themes:

- Keyboard-only operation, visible/unobscured focus and overlay return/recovery.
- Browser-native inert, focus, scroll and touch/drag behavior.
- A real screen reader's names, reading order, live announcements and error associations.
- Zoom/reflow/text-spacing, narrow viewports and long/localized content.
- Actual contrast, forced colors, motion controls and flashing.

Record the browser, assistive technology, composition and observed outcome. A missing manual evaluation is an evidence gap, not a passing
result or an exemption.
