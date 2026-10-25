# Migration Guide

## v2.4 to v3

This section covers the breaking changes from 2.4 to **3.0.0**. Install a published release from npm; do not point an application at this
workspace's source or `dist`.

The historical v0.x → v1.0 guide follows this section unchanged. Its old dependency ranges and examples are historical, not instructions for
adopting v3. In particular, its `<Button render={<a … />}>` link examples are superseded: in v3, links are native `<a>` elements styled with
`buttonVariants()` (see [Button naming and links](#button-naming-and-links)).

### Dependency and packaging decision

- The Base UI peer minimum becomes **`@base-ui/react@^1.9`** (2.4 accepted `^1`). Public 1.0's export map lacks `./drawer`; the tested 1.9
  provides it and declares React `^17 || ^18 || ^19`. This is a verified minimum chosen for this major, **not a claim that 1.9 is the
  earliest possible supporting version**. Consumers using older Base UI must upgrade.
- React and ReactDOM require **`^19`**. React 18 support is removed. Other runtime package names/ranges stay unchanged, including Motion
  13/14, RHF 7 and Recharts 3.8-compatible peers. No Sonner, Headless UI or cmdk dependency is added.
- Supported browsers are Chrome/Edge 120, Firefox 121 and Safari 16.5, the minimums the shipped CSS needs (see the README's
  [Browser Support](./README.md#-browser-support)). 2.4's README listed Chrome/Edge 90, Firefox 88 and Safari 14, which its stylesheets
  already exceeded; confirm your supported browsers before upgrading.
- ESM, declarations, original source, CSS Modules, `styles`/`styles.css`, CSS side effects and client/server boundaries remain supported.
  MIGRATION is included in the package file list. Short public subpaths are explicit; underscore helpers are private even when emitted or
  packed as transitive modules.
- Client boundaries changed for some subpaths: `async-boundary`, `badge`, `breadcrumb`, `empty` and `item` are now `"use client"` modules
  (2.4's were directive-free), so a Server Component can pass their parts only serializable props (no `render` or `className` callbacks) and
  must import `badgeVariants` from the package root to call it, while `field`, `loading-overlay` and `pagination` no longer carry
  `"use client"` and render on the server when a Server Component imports them.
- Receive DOM `ref` as an ordinary typed React 19 prop. Preserve cleanup-returning callback refs and object-ref targets in custom render
  components. Repeated merged-ref identities attach once, retained refs survive reordering, and obsolete disposers cannot detach new nodes.
- `asChild` and the deprecated aliases are removed rather than retained behind another alias. Replace old slots with `render`; set
  `nativeButton={false}` when a button-like primitive renders a non-button element that takes button semantics (for example a `<div>`).
  Links are not button targets: render them as native `<a>` elements styled with `buttonVariants()`.
- `npm test` verifies the built package and a real packed archive: ESM, declarations, CSS, client directives and private-import rejection
  (see [Verification and limits](#verification-and-limits)). Physical-browser and assistive-technology verification remain separate.

### Removed APIs

| Removed surface                                                                                                                         | Canonical replacement                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| All `asChild` props                                                                                                                     | `render` plus the primitive's native/composed-element contract               |
| Callable `toast()` facade and its status helpers (`toast.success`, `toast.dismiss`, …)                                                  | `Toaster`, `toast.add/update/close/promise` or explicit Toast compound parts |
| CommandDialog's automatic `Command` root                                                                                                | `CommandDialog` containing one explicit `Command`                            |
| `AlertDialogAction`'s automatic close                                                                                                   | `AlertDialogAction` with caller-owned successful close                       |
| Accordion scalar values and `type` adapters                                                                                             | Array values in both single- and multiple-panel modes; native `multiple`     |
| Checkbox `checked="indeterminate"`                                                                                                      | Boolean `checked` plus explicit `indeterminate`                              |
| Tooltip root/provider `delayDuration` (v2.4 ignored it on both: the provider was a pass-through, and Base UI 1.x's Root has no `delay`) | Native provider or trigger `delay`                                           |
| NavigationMenuViewport/Indicator compatibility parts                                                                                    | NavigationMenuPositioner and its explicit viewport props                     |
| Structural PopoverAnchor                                                                                                                | A measurable Content `anchor`                                                |
| ContextMenu's deprecated `positionMethod`                                                                                               | Native context-menu positioning options                                      |
| Breadcrumb `separator`, Separator `decorative` and other legacy no-op props                                                             | Explicit parts/native semantics                                              |
| Branch-ambiguous DropDrawer handles                                                                                                     | Branch-specific menu/drawer configuration                                    |
| Flip direction `"righ"`                                                                                                                 | `"right"`                                                                    |
| `hexToHsl`, `hslToHex`, `isValidHexColor`, `getComplementaryColor`, `adjustLightness`, `parseHslString`                                 | Canonically named color utilities                                            |
| Recharts `Cell` reexport                                                                                                                | A series `shape`                                                             |

Source, declarations, root exports and component subpaths no longer expose these surfaces. Old before-examples below explain migration, not
a compatibility option.

### Accessibility and visual behavior

The target is applicable WCAG 2.2 A/AA. Read [ACCESSIBILITY.md](./ACCESSIBILITY.md) for the criteria matrix, localized consumer content,
motion/timing controls and manual browser/assistive-technology obligations. Native/primitive semantics, keyboard operation, focus cleanup
and default light/dark contrast are part of the component contract. Do not infer full-page conformance from Vitest or source CSS.

The default theme adds **`--ac-primary-emphasis`** (light `oklch(0.488 0.243 264.376)`, dark `oklch(0.7 0.14 265.638)`): the primary hue for
text, icons and value indicators drawn directly on neutral surfaces, kept at 4.5:1 on `--ac-background` and 3:1 on `--ac-secondary`.
`--ac-primary` stays the fill behind `--ac-primary-foreground`. Badge `link` text, the active Stepper number, Accordion trigger hover text,
the Progress and Meter fills, the Slider range fill and NumberField scrubbing text now use the new token. Themes that override
`--ac-primary` must override `--ac-primary-emphasis` too, with the same contrast.

Related default contrast and state cues:

- Destructive DropdownMenu, ContextMenu, Menubar and DropDrawer items use
  `color-mix(in oklch, var(--ac-destructive) 80%, var(--ac-foreground))` text, which stays at or above 4.5:1 on the popover, on the
  highlighted item and on muted mobile groups.
- The NavigationMenu link to the current page (`active`, or a caller-supplied `aria-current="page"`) draws a 2px underline in addition to
  the hover tint, so it is not identified by colour alone and stays marked in forced colors.
- The active Command option shows a 2px `--ac-ring` outline (2px `Highlight` in forced colors), like highlighted Select and Combobox items.
- Default Badges and interactive default Bubbles hover to `color-mix(in oklch, var(--ac-primary) 90%, var(--ac-foreground))`. Plain nested
  `<a>` links in Bubble content, AlertTitle, AlertDescription, EmptyDescription, FieldDescription, ItemDescription and MarkerContent inherit
  the surrounding text colour and are underlined (EmptyDescription, FieldDescription, ItemDescription and MarkerContent links also take
  `--ac-foreground` on hover). Their type-only `:where(…) a:is(a)` selectors beat element-only `a {}` resets in any stylesheet order.
  Class-styled anchors such as `buttonVariants()` keep their own paint, including on hover (v2.4's `.description a` rules in Empty, Field
  and Item overrode it), so on the primary surface of Bubble's `default` variant use an opaque-fill variant: Button `default`, `secondary`,
  `outline` or `destructive`, or Badge `default`, `secondary` or `destructive` (Badge `outline` is transparent, unlike Button `outline`).
  Transparent-fill variants (Button `link`/`ghost`; Badge `outline`/`ghost`/`link`) keep text colours meant for neutral surfaces and are not
  supported there.
- In forced colors the selected default-variant Tabs tab sits on a `Highlight` indicator that snaps instead of sliding, and switches to
  `HighlightText` only while that indicator is displayed (never in server HTML or before Base UI measures the tab); the `line` variant keeps
  `CanvasText` over its `Highlight` underline. v2.4 had no forced-colors tab cue.

### Public names and collision rules

Use explicit root or family imports; public named props/state types accompany existing component namespaces where those namespaces are
defined by the family. Generic primitive roots retain their primitive generics and event-detail namespace members.

| Purpose                                | v3 root name                                         | Deliberate distinction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Styled field error component           | `FieldError`                                         | RHF's data type is `RHFFieldError` at the root; `/form` retains its original `FieldError` type.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Native label                           | `Label`                                              | Recharts' label is `RechartsLabel`; supported non-deprecated chart aliases and helpers remain.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Canonical toast root                   | `Toast`                                              | Notification data is `ToastData<T>` / `ToastObject<T>`, not a type alias called `Toast`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Ready-made canonical toast composition | `Toaster`                                            | The callable facade is removed; no `SonnerToaster` is included.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Direction context                      | `DirectionProvider`, `useDirection`, `TextDirection` | Exact Base UI provider/hook identity; no second provider or conflicting `Direction` alias. DropdownMenu (and so Menubar and the desktop DropDrawer menu), ContextMenu, DropDrawer's mobile drawer and the Sidebar roots write `dir="rtl"` only under an RTL `DirectionProvider` (a caller's `dir` wins) and never a default `dir="ltr"`, where v2.4 wrote no `dir`; without an RTL provider, Base UI keeps LTR submenu placement and arrow keys even in an RTL document, so wrap RTL apps in `DirectionProvider direction="rtl"`, and give a part `dir="ltr"` under an explicit LTR provider inside an RTL document. |

RHF's provider, Controller, six hook pass-throughs and existing named RHF types are retained. `Form` is still `FormProvider`, **not a native
`<form>`**. Public additions include full Combobox/Progress/ScrollArea parts, Avatar badge/group/count, CalendarDayButton,
NavigationMenuPositioner, DrawerSwipeHandle, Popover naming parts, TooltipArrow, NativeSelect and the additive Attachment/Bubble/Marker/
Message display families. These display families do not introduce AI/chat SDK, upload, network, application store or localization policy.

### Toast: migrate the facade to a manager

In v2.4, the callable/status facade used the names `toast` and `Toaster`. In v3 **`toast` is a real Base UI manager**, not callable and not
a heuristic overload. Mount its ready-made Toaster before emitting. Canonical Provider timeout/limit and manager timeout/type/actionProps
replace facade duration/visibleToasts/status helpers.

**Before — published v2.4 facade:**

```tsx
import {toast, Toaster} from "@arolariu/components";

<Toaster
  duration={5000}
  visibleToasts={3}
/>;
// Inside an event handler, after the Toaster has mounted:
const id = toast.success("Saved", {duration: 3000, description: "Changes stored"});
toast.update(id, {message: "Saved again"});
toast.dismiss(id);
```

**After — canonical v3 manager:**

```tsx
"use client";
import {toast, Toaster} from "@arolariu/components/toast";
import type {ToastData} from "@arolariu/components/toast";

// Render once before invoking the manager, e.g. from event handlers.
<Toaster
  timeout={5000}
  limit={3}
/>;
// Inside an event handler, after the Toaster has mounted:
const id = toast.add({title: "Saved", description: "Changes stored", timeout: 3000, type: "success"});
toast.update(id, {title: "Saved again"});
toast.close(id);

type Notification = ToastData<{readonly source: "editor"}>;
```

**Default change:** v3 `timeout` defaults to **`0`**, so a notification stays until it is closed; v2.4's `duration` defaulted to **5000
ms**. The after-example passes `timeout={5000}` to keep v2.4's auto-dismissal — omitting it makes every notification persistent. Timed
notifications must still leave users enough time to read them and a way to extend or dismiss them (see
[ACCESSIBILITY.md](./ACCESSIBILITY.md#motion-and-timed-content)).

The ready-made Toaster renders a named close control on every notification. Its accessible name changed from v2.4's `"Close notification"`
to `"Close toast"`; pass a localized `closeLabel` to the Toaster (a standalone icon-only `ToastClose` also defaults to `"Close toast"`).

| Removed v2.4 Toaster/toast option                                                   | v3 replacement                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `duration` (Toaster or per toast)                                                   | `timeout` on Toaster/ToastProvider or per `toast.add()`; the default is now `0` (persistent) instead of 5000 ms                                                                                                      |
| `visibleToasts`                                                                     | `limit` (Base UI default `3`)                                                                                                                                                                                        |
| `closeButton` (Toaster or per toast)                                                | No option: the ready-made Toaster always renders the close control. Compose ToastProvider/Portal/Viewport and Toast parts to change it                                                                               |
| `closeButtonAriaLabel` (per toast)                                                  | Toaster-wide `closeLabel` (default `"Close toast"`, was `"Close notification"`); a per-notification name needs compound Toast parts                                                                                  |
| `containerAriaLabel`                                                                | `viewportProps={{"aria-label": "…"}}`; the viewport name still defaults to `"Notifications"`                                                                                                                         |
| Toaster `className`, `style`                                                        | `viewportProps={{className, style}}`; the v3 Toaster accepts neither prop                                                                                                                                            |
| `action` (per toast)                                                                | `actionProps` button props, with the label as `children` (`actionProps: {children: "Undo", onClick}`); a custom action node needs compound Toast parts                                                               |
| `className`, `descriptionClassName`, `style` (per toast)                            | No per-toast styling options: compose Toast parts with their own `className`, or style by the Toast root's `data-type` (also on Title, Description, Action and Close), e.g. `[data-slot="toast"][data-type="error"]` |
| `toastOptions`                                                                      | No default-options merge: set `timeout` on the Toaster and pass the other options to each `toast.add()` call                                                                                                         |
| `cancel`                                                                            | No replacement in the ready-made Toaster, which renders one `actionProps` action; compose a second control in compound Toast parts                                                                                   |
| `onDismiss`, `onAutoClose`                                                          | Per-toast `onClose` (and `onRemove` after exit animations). They receive no snapshot or cause, so an automatic close is not reported separately                                                                      |
| `toast.custom()`                                                                    | Compound Toast composition with typed `data` (`ToastData<T>`)                                                                                                                                                        |
| `toast.getToasts()`, `toast.getHistory()`                                           | `useToastManager().toasts` lists the nearest provider's current notifications. History has no replacement: keep it in application state                                                                              |
| `toast.update()` `message`/`variant`; `toast.promise()` factory input and `finally` | `toast.update(id, {title, type})`; `toast.promise()` takes a Promise plus `{loading, success, error}`, so run `finally` work on the promise it returns                                                               |

Toaster `position` and the per-toast `id`, `description` and `priority` options keep their names; `id` must now be a string and
`description` a node rather than a factory function.

There is no v3 facade compatibility import. Move custom content to compound Toast composition and application-owned data rather than
restoring callable status helpers, history or snapshot callbacks.

Independent canonical scopes use `createToastManager<Data>()` with `toastManager={manager}` on Toaster or ToastProvider.
`useToastManager<Data>()` reads only its nearest provider. A plain ToastProvider does **not** implicitly attach the global manager. Toaster
`viewportProps` configures the viewport, not custom notification-list children; compose ToastProvider/Portal/Viewport and the Toast parts
for a custom list. Ready-made top placements swipe up/right; bottom placements swipe down/right. Compound roots retain primitive
swipe-direction options and all primitive-owned render states.

Canonical `onClose`/`onRemove` retain their primitive signatures. Do not invent a removal cause or assume that a notification's timeout
proves a user read it. Applications retain critical feedback outside disappearing notifications and own asynchronous rejection handling.

### Command: one explicit native root

CommandDialog is **only the modal shell**. Supply exactly one explicit Command root; v2.4's CommandDialog created it automatically.

**Before — v2.4 automatic root:**

```tsx
<CommandDialog
  open={open}
  onOpenChange={setOpen}>
  <CommandInput placeholder='Search actions' />
  <CommandList>
    <CommandItem onSelect={copy}>Copy</CommandItem>
  </CommandList>
</CommandDialog>
```

**After — canonical v3:**

```tsx
import {Command, CommandDialog, CommandInput, CommandItem, CommandList} from "@arolariu/components/command";

<CommandDialog
  open={open}
  onOpenChange={setOpen}
  title='Actions'
  description='Choose an action'
  showCloseButton={false}>
  <Command
    value={selectedAction}
    onValueChange={setSelectedAction}>
    <CommandInput
      value={search}
      onValueChange={setSearch}
      placeholder='Search actions'
    />
    <CommandList>
      <CommandItem
        value='copy'
        onSelect={copy}>
        Copy
      </CommandItem>
    </CommandList>
  </Command>
</CommandDialog>;
```

Command remains native, **not cmdk**: default matching is case-insensitive substring, not fuzzy ranking; custom filters return finite
positive scores. Root selected `value` is distinct from Input search `value`. Controlled values are authoritative, including temporarily
unmatched values; automatic uncontrolled fallback does not emit user-selection callbacks. Give items stable unique explicit values and IDs,
independent of translated text/shortcut content. Selection is by value: a duplicate value resolves to the first matching option in visual
order, and arrow keys cannot step past it. Inferred values include trimmed shortcut text.

Command keeps and navigates the consumer's rendered order of groups/items inside CommandList, including keyed reorders by memoized rows that
re-render no Command part: a list MutationObserver re-reads them, correcting DOM placement in its microtask and keyboard order in the commit
it schedules, so a key handled in that brief (normally sub-frame) window still uses the previous order. Content, text and attribute changes
inside options never trigger that re-read. It never reorders the DOM unless filtering; while filtering, positive scores order groups/items
with rendered-order ties, and clearing the search restores the rendered order, including keyed reorders and items/groups mounted meanwhile.
Alt+ArrowDown/Alt+ArrowUp move to the first option of the next/previous group run in that visual order: entering or leaving a nested group
is a boundary, runs without selectable options are skipped, and the jumps never reverse or cycle (only `loop` wraps at the ends). Each
CommandItem/CommandGroup renders a hidden, empty `data-command-anchor` span (with an owned `display: none`) as its first DOM node; consumer
CSS that relies on `:first-child`, `:nth-child` or adjacent-sibling selectors over Command parts must account for it.

Keep registered items/groups directly under their List/Group for score/DOM ordering. Arbitrary cross-wrapper nested score layout, cmdk
hooks/Loading/store/measurement variables and a generic cmdk/asChild API are not supplied. Native option focusability remains; separators
hide during search unless `alwaysRender`. Empty counts visible disabled/force-mounted options but not externally hidden ones. Native
consumer event cancellation is preserved. Local centered geometry and the default "Command menu" title are retained, not claimed to
reproduce upstream pixels.

CommandEmpty is a polite status region (`role="status"`, `aria-atomic="true"`) that stays mounted while its CommandList is mounted on the
client (or in place, from the first render, when it is outside a list); only its children toggle, so later "no results" text is written into
that existing region, while an empty state present when the list first mounts appears together with the region. Inside CommandList it is
portaled into a `display: contents` `data-slot="command-empty-slot"` element that CommandList renders just before the listbox, so it is no
longer a listbox child; it appears there after mount, not in server HTML. The region collapses its padding while empty: style CommandEmpty
margins and borders with `:empty`/`:not(:empty)`, and account for the slot element in sibling selectors around CommandList.

CommandInput's localizable `fallbackLabel` (default `"Search commands"`) names the input only when no `aria-label`, `aria-labelledby`,
associated `<label>`, `title` or `placeholder` names it. It is decided after mount, so server markup never carries it; the placeholder-only
examples above are named by their placeholder. The active option also draws a 2px `--ac-ring` outline (see
[Accessibility and visual behavior](#accessibility-and-visual-behavior)).

### Button naming and links

`ButtonProps` is now a naming union. The icon sizes (`icon`, `icon-xs`, `icon-sm`, `icon-lg`) require a string `aria-label` or
`aria-labelledby`; visible or visually hidden text alone does not satisfy the type for those sizes. Because the props are a union,
`interface X extends ButtonProps` fails with TS2312 ("An interface can only extend an object type or intersection of object types with
statically known members"); declare an intersection type alias instead. The same applies to `InputGroupButtonProps` (`ButtonProps` with its
`ghost`/`xs` defaults documented), to `AlertDialogActionProps`, which aliases `ButtonProps`, and to `SidebarTriggerProps`.

```tsx
import {Button, type ButtonProps} from "@arolariu/components/button";
import {X} from "lucide-react";

// Before: `interface CustomButtonProps extends ButtonProps {…}` — TS2312 in v3.
type CustomButtonProps = ButtonProps & {readonly icon?: React.ReactNode};

<Button
  variant='ghost'
  size='icon'
  aria-label='Close panel'>
  <X />
</Button>;
```

Button always exposes button semantics, so it is for actions, not navigation: a link rendered through Button is announced as a button, is
missing from the page's list of links and activates on Space. Render links as native `<a>` elements styled with `buttonVariants()`, and keep
`render` with `nativeButton={false}` for non-link targets that take button semantics, such as a `<div>`.

```tsx
import {Button, buttonVariants} from "@arolariu/components";

// Before: <Button nativeButton={false} render={<a href='/dashboard' />}>Go to dashboard</Button> rendered a link as a button.
<a
  href='/dashboard'
  className={buttonVariants({variant: "outline"})}>
  Go to dashboard
</a>;

<Button
  nativeButton={false}
  render={<div />}>
  Run task
</Button>;
```

With `variant: "link"`, a real anchor stays underlined at rest (a non-colour cue), while `<Button variant="link">` underlines only on hover;
the other variants never underline. Import `buttonVariants` from the package root (`import {buttonVariants} from "@arolariu/components"`) to
call it in a Server Component: the root re-exports it from a directive-free module. The `@arolariu/components/button` subpath re-exports the
same function from a `"use client"` module, where it is a client reference, so import it from that subpath only in Client Components.
`badgeVariants`, `buttonGroupVariants`, `markerVariants`, `navigationMenuTriggerStyle`, `tabsListVariants` and `toggleVariants` follow the
same rule.

### Changed defaults, motion and generated controls

| Surface                                                                                                                                                                                      | v2.4                                                                                               | v3                                                                                                                                                                                                                                                                                                                                 | Opt-in or replacement                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Toast auto-dismiss                                                                                                                                                                           | `duration` defaulted to 5000 ms                                                                    | `timeout` defaults to `0`: notifications persist until closed                                                                                                                                                                                                                                                                      | `timeout` on Toaster/ToastProvider or per `toast.add()`; see [Toast](#toast-migrate-the-facade-to-a-manager)                                                                                                              |
| Toast close control name                                                                                                                                                                     | `"Close notification"`                                                                             | Toaster `closeLabel`, default `"Close toast"`                                                                                                                                                                                                                                                                                      | A localized `closeLabel`                                                                                                                                                                                                  |
| Visual effects: BackgroundBeams, BubbleBackground, DotBackground, FireworksBackground, GradientBackground, GradientText, HighlightText, HoleBackground, TypewriterText, TypewriterTextSmooth | No time limit on automatic motion                                                                  | Automatic motion settles to a static frame five seconds after mount (wall clock; scrolling does not restart it). Reduced motion, a hidden document and off-screen instances also pause. CountingNumber, which has no `loop`, then shows its final value                                                                            | `loop` keeps automatic motion running and requires a caller-supplied, localized native pause/stop control that sets `motionPaused` (WCAG 2.2.2); `motionPaused` stops motion at any time                                  |
| Skeleton, including Card/Form/List/Table skeletons                                                                                                                                           | Pulsed indefinitely                                                                                | Two pulses (four seconds), then static                                                                                                                                                                                                                                                                                             | No infinite pulse; `animated={false}` or reduced motion keeps it static from the start                                                                                                                                    |
| ResizableHandle                                                                                                                                                                              | No step buttons                                                                                    | Native −/+ step buttons after each separator: two extra tab stops per handle                                                                                                                                                                                                                                                       | `decreaseLabel`, `increaseLabel`, `resizeStep`; `withControls={false}` (see the Carousel/Resizable row below)                                                                                                             |
| FireworksBackground                                                                                                                                                                          | Clicking the canvas launched fireworks                                                             | Decorative canvas (background clicks do nothing) plus a native launch button, `launchLabel` default `"Launch fireworks"`                                                                                                                                                                                                           | The button stays available after automatic launches settle and in `population={0}` click-only mode; it is `aria-disabled` (still focusable, activation ignored) under reduced motion, `motionPaused` or a hidden document |
| Scratcher                                                                                                                                                                                    | Pointer scratching only                                                                            | A native reveal button (`revealLabel`, default `"Reveal content"`) and a visually hidden completion status (`completedLabel`, default `"Content revealed"`); after the reveal the button keeps focus and its tab stop as `aria-disabled` (activation ignored) until a `width`, `height` or `gradientColors` change resets the card | Localized `revealLabel` and `completedLabel`                                                                                                                                                                              |
| PaginationPrevious / PaginationNext                                                                                                                                                          | Named `"Go to previous page"` / `"Go to next page"`; visible `"Previous"` / `"Next"`               | The visible `text` is also the accessible name: `"Previous"` / `"Next"`                                                                                                                                                                                                                                                            | A localized `text`                                                                                                                                                                                                        |
| SidebarMenuButton tooltips                                                                                                                                                                   | Base UI's default open delay (600 ms); SidebarProvider's `TooltipProvider` was a pass-through shim | Collapsed-sidebar `tooltip` content opens without delay (`delay={0}` on its own trigger); other tooltips are unaffected                                                                                                                                                                                                            | For another delay, omit `tooltip` and compose `Tooltip` with `TooltipTrigger delay={…} render={<SidebarMenuButton …/>}`                                                                                                   |
| Carousel transitions                                                                                                                                                                         | Embla's `duration` (default 25) regardless of the motion preference                                | Instant (`duration: 0`) while `prefers-reduced-motion: reduce` matches; the caller's or Embla's default `duration` returns when it clears                                                                                                                                                                                          | Other reduced-motion options go in `opts.breakpoints["(prefers-reduced-motion: reduce)"]`; its `duration` is always `0`                                                                                                   |
| Table scroll viewport                                                                                                                                                                        | Plain, non-focusable `<div>`                                                                       | A tab stop (`tabIndex={0}`) with a focus ring and no role or name                                                                                                                                                                                                                                                                  | Name it with `containerProps={{role: "region", "aria-labelledby": captionId}}`; `containerProps={{tabIndex: -1}}` only when the table can never overflow                                                                  |

### Breaking defaults, values, refs and native tags

| Family                           | Migration / retained boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button and composed controls     | Non-button canonical targets that take button semantics must specify `nativeButton={false}`; links are native `<a>` elements styled with `buttonVariants()`, not Button render targets. Refs truthfully target `HTMLElement` where composition permits non-button elements; native button refs remain usable. Button adds `xs`, `icon-xs`, `icon-sm`, `icon-lg`; exhaustive consumer size maps must include them. Icon sizes require `aria-label` or `aria-labelledby`, and `ButtonProps` (with `InputGroupButtonProps`, `AlertDialogActionProps` and `SidebarTriggerProps`) is a union: replace `interface X extends ButtonProps` with `type X = ButtonProps & {…}`. See [Button naming and links](#button-naming-and-links).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Badge                            | Default element/ref becomes `span` / `HTMLSpanElement`, not div. Use `render={<div />}` deliberately for block markup; composed refs follow the real element. Ghost/link variants are additive. The `link` variant's text uses `--ac-primary-emphasis`, and default badges hover to a foreground mix (see [Accessibility and visual behavior](#accessibility-and-visual-behavior)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Breadcrumb/Item                  | Composed refs target HTMLElement; native parts retain their exact tags. Item's default div is noninteractive. Breadcrumb root separator is removed; use BreadcrumbSeparator.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Primitive render/class callbacks | Wrappers no longer evaluate these through a stateless outer renderer. Callback props/state belong to the actual primitive and callback refs are merged callbacks, not assumed mutable ref objects. Preserve forwarded props/ref and use actual state, event details and cancellation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Accordion                        | Values and callbacks are string arrays in both single- and multiple-panel modes. Use native multiple, never type or scalar values. An empty array selects nothing; an array containing the empty string selects that item. collapsible=false cancels empty proposals using the original event details. Each trigger renders inside Base UI's Header, an `<h3>` by default (`data-slot="accordion-header"`); applications own the heading level, so pass `headerProps={{render: <h2 />}}` (typed `AccordionHeaderProps` or `AccordionTrigger.HeaderProps`) when `<h3>` does not continue the outline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Collapsible                      | Open callbacks keep primitive event details; `details.trigger` is not synthesized when absent. Trigger render children are retained.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Slider                           | Scalar stays scalar; readonly/mutable ranges retain primitive inference and one thumb per supplied endpoint, including zero for an empty range. An omitted default is the primitive's single minimum, not an invented range. Keep `(value, details)` change/commit callbacks and native named inputs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Progress                         | Omitted/null values are primitive indeterminate state, not coerced to zero. Root children are retained. Four explicit parts replace the convenience track when a direct local/Base UI track is supplied; Value formatting belongs to the primitive.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Tabs                             | Default/line visual variants are explicit. Disabled tabs may remain keyboard-focusable under the primitive's `focusableWhenDisabled` policy, but cannot activate. Panel hiding follows transition completion, not synchronous selected-value inequality.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Select                           | Root retains generic object/number/multiple values and nullable single selection. Do not filter callbacks into old string-only values; retain original `(value, details)`, equality, cancellation and clear semantics. To name the listbox use `listProps`, not only Popup's label.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Combobox                         | No automatic search/List/Empty block, transient item-label registry or empty-string deselection. Move root placeholder/searchPlaceholder/emptyMessage/className to explicit Value/Input/Empty/visual parts; supply persistent Root `items`, an explicit ComboboxList, ComboboxLabel instead of group heading and root filter/data instead of item keywords. Single clearing yields null; multiple yields arrays. No legacy-combobox engine is added. ComboboxEmpty's `role="status"` root stays mounted while rendered and only its children toggle; it collapses its padding while empty, so style its margins/borders with `:empty`/`:not(:empty)`, and never hide it with `hidden`, `display: none`, `aria-hidden` or conditional rendering. ComboboxContent defaults to `align="start"` and `sideOffset={6}` (Base UI: `"center"`, `0`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Dialog/Sheet                     | Content icon close defaults true; showCloseButton=false opts out. DialogFooter's optional close defaults false. Exported Close parts are unstyled. Automatic dismissal labels are caller-localizable; compose only through render. Content renders the page-blocking backdrop only when the root has `modal={true}` (the default): `modal={false}` and `"trap-focus"` leave the page visible and pressable, and an outside press still dismisses unless `disablePointerDismissal`. Use `modal={true}` where a backdrop is required. `portalProps` configures Content's internal Portal (`keepMounted`, `container`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| AlertDialog                      | Action is an ordinary Button and does not close. Explicitly close after successful asynchronous work and retain pending/rejection policies. Cancel remains Close-backed. Base UI retains Escape and outside-dismissal policy through original cancellable details. `AlertDialogContent` accepts `portalProps` (`keepMounted`, `container`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Popover                          | The structural PopoverAnchor adapter is removed. Supply Content anchor with a measurable element/ref. Header owns layout; Title and Description own accessible registration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Tooltip/HoverCard                | Render/state/timing belongs to the primitive. Use native provider/trigger delay; delayDuration is removed. Tooltip's decorative Arrow can be disabled with showArrow=false before custom TooltipArrow composition. Preserve hover/focus visibility and Escape dismissal. `TooltipProvider` is now Base UI's provider (v2.4's was a pass-through that ignored `delayDuration`): its `delay`, `closeDelay` and `timeout` (default 400 ms) apply to the tooltips inside it, and a tooltip there opens instantly when another closed less than `timeout` earlier, so wrapping an app in `<TooltipProvider>` changes its tooltip timing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Menus                            | Popup render/class/ref/focus remain on Popup, positioning options on Positioner, portal options on Portal. Trigger refs may be HTMLElement. Primitive checked/value/nativeButton/event details are not converted; submenu `inline-end` is RTL-aware. The props document the deliberate placement defaults (side/align/sideOffset/alignOffset): DropdownMenuContent unset/start/4/0; DropdownMenuSubContent and MenubarSubContent inline-end/start/0/−3; MenubarContent unset/start/8/−4; ContextMenuContent inline-end/start/0/4; DropDrawerContent (desktop) align `end`; NavigationMenuPositioner bottom/start/8/0; PopoverContent and TooltipContent `sideOffset` 4; HoverCardContent offsets 4/4. DropdownMenuContent and MenubarContent leave `side` unset unless provided, so Base UI opens root menus below the trigger and vertical Menubar menus toward the inline end. ContextMenuContent defaults to the logical `side="inline-end"` (left in RTL; the popup reports `data-side="inline-end"`), start alignment and offsets 0/4 (side/align). v2.4 passed no placement, so Base UI's context-menu default applied (with Base UI 1.9: `data-side="bottom"`, start alignment, side offset −5 and align offset 2). Destructive items use the contrast-safe text mix (see [Accessibility and visual behavior](#accessibility-and-visual-behavior)).                                                                                                  |
| Drawer                           | Actual Viewport owns gestures/snaps/nesting. Modal true alone has a blocking backdrop; nonmodal/trap-focus viewports do not. Default down/modal behavior remains; `showSwipeHandle` defaults false, and decorative DrawerSwipeHandle stays outside Content. No snap point/list is invented. With vertical `snapPoints`, keyboard or programmatic focus on a control that the active snap point keeps (even partly) off-screen requests the largest snap point through `onSnapPointChange` with `reason: "none"`: uncontrolled drawers expand, controlled owners must apply or cancel the request. Supply a snap point tall enough for every focusable control (for example `1`), or keep focusable controls within the smallest snap height. `DrawerContent` accepts `portalProps`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| NavigationMenu                   | Root supplies an automatic positioned Popup/Viewport, including opaque Flight render elements. Set positionerProps=false for explicit NavigationMenuPositioner composition. Viewport/Indicator compatibility adapters are removed. Mark the current page's link with `active` (Base UI adds `aria-current="page"`); it draws a 2px underline besides the hover tint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Sidebar                          | Root ref follows actual desktop/static/mobile popup; Inset is native main, list/item parts retain ul/li refs. Functional desktop/mobile setters and controlled behavior remain. Polymorphic action/label/button state is wrapper-owned, not fabricated Menu/Tooltip/Sheet state. `isActive` on SidebarMenuButton and SidebarMenuSubButton now also sets `aria-current="page"` (with a forced-colors cue, and an underline on sub-buttons); pass another `aria-current` value for other kinds of current item, or `aria-current={undefined}` on section/disclosure triggers whose active styling does not mark the current page. The mobile sheet now renders a visible, named close control, last in DOM order and pinned to the top inline-end corner above a reserved top row. `showCloseButton` (default `true`) controls both; `closeLabel` defaults to `"Close sidebar"`. In v2.4 that name belonged to the full-screen overlay button; the v3 backdrop is not a named control. SidebarProvider still writes the `sidebar_state` cookie (`path=/`, `max-age=604800`) on every desktop open-state change, including controlled proposals, and never reads it: seed `defaultOpen` from it, or pass the new `persistState={false}` when you persist the state yourself. Ctrl+B / Cmd+B toggles the sidebar unless a `keydown` handler calls `preventDefault()` first (v2.4 toggled regardless).                                                           |
| Calendar                         | DayPicker discriminated selection modes and primitive callbacks remain. Styled classNames append, except animation keys are a **single replaced token**, not a merged class list; provide CSS for overridden tokens. Custom components replace defaults, Custom Root must attach merged rootRef, and locale-aware CalendarDayButton preserves native button refs. DayPicker names each day button through `labels.labelDayButton`, so custom DayButton children are presentational: put meaningful day content (events, availability) into that label and mark visual-only content `aria-hidden`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Carousel/Resizable               | Carousel requires a region name: `CarouselProps` is a naming union, so pass a localized `aria-label` or `aria-labelledby` (v2.4 rendered an unnamed `role="region"`), and replace `interface X extends CarouselProps` with `type X = CarouselProps & {…}`. Keep Embla options/plugins/API and real `useCarousel` context. Navigation refs follow Button's HTMLElement contract. Resizable remains installed v4 Group/Panel/Separator with primitive imperative handles/callbacks; use percentage-string constraints and primitive orientation state, not old ad hoc selectors. `ResizableHandle` renders native −/+ step buttons after each separator (two extra tab stops; `decreaseLabel`/`increaseLabel`/`resizeStep`), placed outside the separator's drag area, with `data-slot` hooks `resizable-controls`/`resizable-decrease`/`resizable-increase`. The controls container carries react-resizable-panels' `data-resize-preview` marker so it never changes separator hit regions; scope any `[data-resize-preview]` styling to the primitive's preview overlays. Opt out with `withControls={false}` only alongside another single-pointer resize alternative (WCAG 2.5.7). The default clearance assumes the 1px separator and a `resizeTargetMinimumSize` of at most 22px; reposition the controls through the hooks if you widen either.                                                                                                        |
| ScrollArea                       | `ScrollBar` keeps its 24px (1.5rem) track mounted by default (`keepMounted` defaults to `true`). While its axis fits, the track stays in the DOM but is hidden and paints nothing; code or tests that expected it to be absent must check `visibility` or use a composed `ScrollBar` with `keepMounted={false}`. Whenever a package-styled track is mounted, the viewport (now `box-sizing: border-box`) reserves a stable 1.5rem gutter plus scroll padding (inline-end for vertical, block-end for horizontal), present in server HTML and independent of overflow. Content is therefore 1.5rem narrower or shorter even without overflow, and the gutter replaces the viewport's own end padding on that axis (pad `ScrollAreaContent` instead). The convenience `ScrollArea` always reserves the vertical gutter; to opt out, compose `ScrollAreaRoot` with `<ScrollBar keepMounted={false} />`, which restores mount-on-overflow: the gutter then appears after hydration and can oscillate for width-dependent content. Restyled tracks wider than 1.5rem need a matching gutter.                                                                                                                                                                                                                                                                                                                                                                     |
| Chart                            | ChartContainer id/class/ref now belong to the native **outer root**, not ResponsiveContainer's optional measuring div. Native id/className are strings. Use JSX content or callbacks returning JSX for ref-capable Tooltip/Legend content, not direct function invocation. Generated data-chart scopes are internal unique IDs; use native id/class/data-slot instead. Unsafe config color declarations are omitted; nullish formatter output suppresses rows and default ranges use `~`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Form/Field                       | Form remains RHF's provider. FormControl preserves real element/event refs and child-first cancellation; no implicit replacement of the RHF update handler. Only mounted meaningful description/message nodes get ARIA references; blank/boolean/empty-fragment errors don't create empty messages, but numeric zero remains meaningful. Invalid fields can remain invalid without text. Inline messages are not automatic alerts: own one submission announcement. Server HTML and the hydration render already carry the label/control association and `aria-describedby`, derived from the FormLabel/FormControl/FormDescription/FormMessage elements written in the FormItem's children (through fragments and wrapper elements, not nested items) and honoring explicit IDs. Limits: parts rendered internally by other components link only once they mount, and server HTML links a generated description or message only when it is the item's single generated part of that kind, so give additional parts explicit IDs. Until hydration, server HTML can reference a written part that renders empty or not at all, and a written plus a component-rendered generated description can share one ID. After hydration, mounted parts refine the links and generated IDs become unique.                                                                                                                                                              |
| Input/OTP/Textarea/Label         | Input state/callbacks remain Base UI-owned. OTP invalid indexes fail fast; active caret suppresses placeholder, inactive empty slots retain placeholder or `·`. Textarea and Label remain native/server-compatible; Textarea defaults to manual resizing, with `data-sizing="content"` as CSS progressive enhancement, not a fabricated Base Textarea/autoresize API.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Native/display parts             | AlertTitle remains h5. Alert keeps normal flow for free-form children; the new `AlertAction`, as a direct child, switches it to a two-column grid (the action in the trailing column, every other element child in the message column; wrap loose text in `AlertDescription`). EmptyDescription remains a `<p>` by default; compose block content with `render={<div />}` (Base UI `useRender`; caller props, including `data-slot`, are applied last; render callbacks receive `EmptyDescriptionState`). The `empty` module is now a client module (v2.4's was server-compatible), like Badge, Marker and BubbleContent. Kbd/group remain native kbd; Table remains a real table with its horizontal wrapper. Skeleton/Spinner can use `animated={false}` and reduced motion; Skeleton pulses twice, then stays static. Neither announces loading reliably (Spinner's `role="status"` and default `"Loading"` name identify it but are not an announcement): write text into a status region mounted before loading starts (LoadingOverlay's `loadingLabel`, AsyncBoundary's default fallback, `useAnnounce` or a persistent `VisuallyHidden role="status"`), keep `aria-busy` off that region and mark the spinner `aria-hidden="true"`. ScrollArea convenience composition stays; explicit Root/Viewport/Content/Thumb/Corner parts support sibling axis scrollbars and actual viewport refs (see the ScrollArea row for its gutter and track mounting). |
| Boundaries/loading               | Explicit `fallback={null}` stays empty. ErrorBoundary normalizes unknown thrown values to Error with cause, preserving genuine Error identity. Reset requires repaired descendants/replaced rejected resource. AsyncBoundary owns no fetch/cache/DOM ref. FocusScope is local keyboard scope, not a modal engine. With `contain` (default) the consumer provides and announces a keyboard exit; focusable `aria-disabled` controls are tab stops. LoadingOverlay is visual/non-intercepting; the caller owns inert/disabled/busy/focus and keeps the overlay outside busy and inert subtrees. It always renders a persistent, visually hidden `role="status"` region (empty while hidden) and writes `loadingLabel` (default `"Loading"`) into it while `visible`, so keep it mounted and toggle `visible`. The overlay element has no role: pass the loading message as `loadingLabel`, not `aria-label`. AsyncBoundary is a Client Component; with the default fallback (a decorative spinner) a new visually hidden `<span role="status">` follows its content for the boundary's whole lifetime, and `loadingLabel` is written into it while suspended. In list or table contexts, where that `<span>` sibling does not fit the content model, pass a fitting `loadingFallback`, which renders no region. A custom or `null` fallback owns its announcement.                                                                                            |
| DropDrawer                       | Open state survives breakpoint changes; submenu path resets and the new primitive owns focus. Mobile actions are native buttons; desktop uses Menu. `closeOnClick` defaults true, including submenu actions. Live registrations are not cached React children. Desktop maps trap-focus to Menu modal mode; mobile follows Drawer backdrop rules. Shared states are engine unions: narrow them rather than assuming Menu highlighting on mobile. On mobile, a submenu's drill-down panel heading, which also names the drawer dialog while that panel is active, comes from `DropDrawerSub`'s localizable `title`, then the trigger's `label`, then its visible text (excluding `aria-hidden` and `hidden` content), then the root `mobileTitle`; set `title` for icon-only, `aria-label`-named or badge/count triggers. Desktop menus ignore it. Choose the owner with `presentation`: the default `"responsive"` switches at `(max-width: 767px)` and server-renders the desktop Menu; `"menu"` and `"drawer"` force one owner, on the server too. Derive a custom breakpoint with `useMediaQuery`.                                                                                                                                                                                                                                                                                                                                                        |
| Local visual/motion extensions   | Background/text/canvas extensions and Copy/Counting/Flip/Ripple/Stepper/Timeline/Typewriter/VisuallyHidden remain. Canvas refs and error policies retain their owning contracts. Flip accepts right, not righ. Preserve native keyboard reveal, meaningful readable text, reduced-motion alternatives and user-operable control of continuing motion. Automatic motion settles after five seconds unless `loop`, and FireworksBackground and Scratcher add native generated controls (see [Changed defaults, motion and generated controls](#changed-defaults-motion-and-generated-controls)).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### Caller-owned Stepper completion copy

`completedLabel` controls the assistive text appended to completed steps. Its default remains `"Completed"`; pass translated text for the
consumer's locale, or an empty string to omit the completion suffix. The step labels and native root `aria-label` remain caller-owned.

```tsx
<Stepper
  steps={["Compte", "Profil", "Vérification"]}
  activeStep={1}
  completedLabel='Terminé'
  aria-label='Progression'
/>
```

### Exact Skeleton count/error policy

Card `lines`, Form `fields`, List `items` and Table `rows`/`columns` must each be **finite nonnegative integers ≤ 10,000**. No coercion,
clamping or truncation occurs. Invalid or over-limit counts synchronously throw documented **RangeError before allocation**.

Table additionally requires **`(rows + (showHeader ? 1 : 0)) * columns ≤ 10,000`**, after both axes are validated and before arrays are
allocated. `showHeader` defaults true. Valid zero dimensions remain valid: zero card lines preserve header/footer; zero form fields preserve
submit; zero list items leave an empty root; zero table axes retain requested empty rows/header unless header is disabled. Default counts
stay Card 3 / Form 4 / List 5 / Table 5 rows × 4 columns; List avatar remains enabled by default. All four root refs remain HTMLDivElement.
Internal skeletons are decorative and announce nothing; the caller owns one loading announcement through a persistent status region mounted
before loading starts (for example a `VisuallyHidden role="status"` that receives its text when loading begins), not a labeled or
`aria-busy` skeleton.

```tsx
// Before: invalid counts could be silently normalized or allocate unbounded arrays.
<TableSkeleton
  rows={5000}
  columns={4}
/>;

// After: validate counts upstream; this is valid with the header included.
<TableSkeleton
  rows={2499}
  columns={4}
/>;
// Exactly 10,000 cells without a header:
<TableSkeleton
  rows={2500}
  columns={4}
  showHeader={false}
  animated={false}
/>;
```

### Retained extensions and unselected families

CSS Modules and `--ac-*` tokens remain; no Tailwind/CVA/external cn/runtime CSS-in-JS migration. Primitive-generated geometry/animation
styles and narrowly approved data-driven bridges (e.g. chart series color/aspect ratio) are not a general styling exception. Recharts
non-deprecated primitives/hooks/constants, RHF pass-throughs, existing calendar/OTP regex and imperative-panel types remain. Chart config
`stackId` is consumer metadata, not automatic series configuration; outer Recharts positioning/sorting/container props remain outer
responsibilities. Configure legend positioning/layout through the actual `ChartLegend`, not removed no-op custom-content props.
`ChartLegendContent` exposes its supported per-item callbacks only; engine-injected layout/presentation fields are consumed internally
instead of leaking to the DOM. `hideIndicator` keeps configured tooltip icons, and `hideIcon` replaces legend icons with swatches.
SDK-inactive legend items append caller-owned `inactiveSuffix` (default `" (hidden)"`; `""`/`null` suppresses), which is visible and part of
clickable items' names. Existing Breadcrumb root separator and decorative compatibility flags are removed.

Optional headless-UI, Sonner and cmdk engine families are not included: there are no root exports for them and no eager imports of absent
engines. Native Command and canonical components are not renamed substitutes for those engines. Private underscore modules may ship
transitively but are not supported imports.

### Repository website adoption checklist

The repository website (`sites/arolariu.ro`) pins the published 2.4 tarball. When it adopts a published v3 release:

1. Update the website's official tarball/integrity through its separately authorized dependency adoption, never a local workspace alias.
2. Migrate facade-dependent status/promise/custom calls to canonical manager/compound APIs.
3. Commander must compose the canonical shell with exactly one explicit Command; keep localized title/description, stable action values,
   separate selected/search state and app-owned shortcuts.
4. Async AlertDialog callers must own success-close/rejection/pending policies.
5. Recheck native refs, form/value/callback contracts and affected application tests against the published package.
6. Decide each changed default in [Changed defaults, motion and generated controls](#changed-defaults-motion-and-generated-controls)
   explicitly. The site's `providers.tsx` renders `<Toaster />` without props, which in v3 makes every notification persistent: pass
   `timeout` where v2.4's 5000 ms auto-dismissal is still intended (with enough reading time and a way to dismiss) and a localized
   `closeLabel`. Choose between settled motion and `loop` plus a localized pause control for the decorative effects the site renders
   (BackgroundBeams, DotBackground, GradientText, TypewriterTextSmooth), and expect two-pulse skeletons in route `loading.tsx` files.
   CountingNumber (the platform statistics use `inView`) has no `loop` opt-in: five seconds after mount it shows its final value, so a
   counter scrolled into view later no longer counts up.
7. Localize every generated name this guide lists for the components the site renders, such as Toaster `closeLabel` and the Toaster viewport
   name (`viewportProps={{"aria-label": …}}`, default `"Notifications"`). Commander's CommandInput is named by its translated placeholder,
   so its English `fallbackLabel` does not apply there.
8. Render links styled as buttons as native anchors with `buttonVariants()` (in Server Components, import it from `@arolariu/components`;
   the `/button` subpath works only in Client Components), give every icon-size Button an `aria-label` or `aria-labelledby`, and replace
   `interface … extends ButtonProps` with intersection type aliases. Name both carousels, which render none today (the scans preview in
   `CreateInvoiceDialog.tsx` and the scan media in `InvoiceCard.tsx`), with localized `aria-label` or `aria-labelledby` values from new
   `en`/`ro`/`fr` messages; `CarouselProps` is a naming union too.
9. The site's `TooltipProvider` wrappers (across the invoice routes and in the footer) become real Base UI providers in v3, so their
   grouping (a tooltip opens instantly when another closed less than `timeout`, default 400 ms, earlier) and any `delay`/`closeDelay` now
   apply. `SpendingCalendarHeatmap.tsx` passes `delayDuration={100}`, which v2.4 ignored (its tooltips used the 600 ms default) and v3
   rejects at the type level: move the timing to the provider's `delay` or to `TooltipTrigger delay`, or drop it to keep the 600 ms default.

Follow-up candidates include Commander; InvoicePreferences; DeleteScanDialog/ShareInvoiceDialog; edit-invoice SharingCard,
ItemsTable/EditInvoiceContext and AddRecipe/AddScan/Allergen/DeleteRecipe/Feedback/RemoveScan/UpdateRecipe dialogs; CreateInvoiceContext;
ScanUploadContext and its test/types/uploadSession; ShareCollaborateCard; invoice/bulk Export dialogs and BulkActionsToolbar;
ScanSelectionToolbar/CreateInvoiceDialog/useScans; useInvoiceDelete/useInvoiceShare/useScanAdd/useScanDelete/useScanRename/useScanRotation;
detachScanFromInvoice/createScan. This inventory does not authorize route, auth, Next configuration or domain-logic changes.

### Verification and limits

From the package directory, `npm test` builds the package, packs and extracts a real npm archive, and runs the complete Vitest suite with
`AROLARIU_COMPONENTS_PACKED_ROOT` set to that extraction:

```powershell
npm test
```

The run covers:

- colocated component, hook and utility tests that exercise real modules and Base UI primitives, without replacement mocks or an alternate
  automated runner;
- the complete source/test/story TypeScript graph (`src/type-contracts.test.ts`), including negative API assertions;
- the packed archive: every public ESM entry point loaded with the installed peers, strict compilation of the shipped declarations, client
  directives, stylesheets, private-import rejection and the absence of tests, stories and story-only styles;
- the coverage thresholds configured in `vitest.config.ts`.

`npm run test:unit -- <selectors> --coverage.enabled=false` is for focused source iteration: it skips the archive contracts and makes no
aggregate coverage claim, and source/test/story type checks do not prove packed ESM/declaration/style availability.

Physical painting, native browser focus/inert, pointer/touch gestures, animation, clipboard permissions, scrolling/anchoring and
screen-reader speech are not established by these tests: Happy DOM geometry fixtures and parsed CSS are not physical-engine proof.
[ACCESSIBILITY.md](./ACCESSIBILITY.md#verification-boundary) lists the manual browser and assistive-technology checks.

---

# 🚀 Historical Migration Guide: v0.x → v1.0

> **Breaking changes from Radix UI + Tailwind to Base UI + CSS Modules**

This guide helps you migrate from **@arolariu/components v0.x** (Radix UI + Tailwind CSS) to **v1.0** (Base UI + CSS Modules). The 1.0
release is a complete architectural rewrite with breaking changes in primitives, styling, composition, and design tokens.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Breaking Changes Summary](#-breaking-changes-summary)
- [Step-by-Step Migration](#-step-by-step-migration)
  - [1. Update Dependencies](#1-update-dependencies)
  - [2. Remove Radix UI Packages](#2-remove-radix-ui-packages)
  - [3. Update Imports](#3-update-imports)
  - [4. Migrate from Tailwind to CSS Modules](#4-migrate-from-tailwind-to-css-modules)
  - [5. Replace `asChild` with `render`](#5-replace-aschild-with-render)
  - [6. Update Design Tokens](#6-update-design-tokens)
  - [7. Migrate Variant Helpers](#7-migrate-variant-helpers)
  - [8. Update Toast Usage](#8-update-toast-usage)
  - [9. Update Command Palette](#9-update-command-palette)
  - [10. Update DropDrawer](#10-update-dropdrawer)
- [Component-Specific Changes](#-component-specific-changes)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

### What Changed?

| Aspect            | v0.x                           | v1.0                            |
| ----------------- | ------------------------------ | ------------------------------- |
| **Primitives**    | Radix UI (`@radix-ui/react-*`) | Base UI (`@base-ui/react`)      |
| **Styling**       | Tailwind CSS utility classes   | CSS Modules (`.module.css`)     |
| **Composition**   | `asChild` prop                 | `render` prop (Base UI pattern) |
| **Design Tokens** | `--ui-*` CSS variables         | `--ac-*` OKLCH color space      |
| **Variants**      | CVA (class-variance-authority) | CSS Module class maps           |
| **Toast**         | `sonner` package               | Base UI Toast-backed            |
| **Command**       | `cmdk` package                 | Native implementation           |
| **Drawer**        | `vaul` package                 | Base UI Drawer                  |

### Why Migrate?

- ✅ **Smaller Bundle**: No Tailwind JIT, CVA, or multiple Radix packages
- ✅ **Better Performance**: CSS Modules are statically extracted
- ✅ **Modern Standards**: Base UI is the successor to Radix UI
- ✅ **Type Safety**: Namespace types (`Component.Props`, `Component.State`)
- ✅ **Flexibility**: OKLCH design tokens for advanced color manipulation

---

## 💥 Breaking Changes Summary

### 1. Primitive Library Migration

**Before (v0.x):**

```tsx
import * as Dialog from "@radix-ui/react-dialog";
```

**After (v1.0):**

```tsx
import {Dialog} from "@base-ui/react/dialog";
```

**Impact:** All components now use `@base-ui/react` instead of 25+ separate `@radix-ui/react-*` packages.

---

### 2. Styling Migration

**Before (v0.x):**

```tsx
<Button className='bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2'>Click Me</Button>
```

**After (v1.0):**

```tsx
import styles from "./my-app.module.css";

<Button className={styles.myButton}>
  Click Me
</Button>

/* my-app.module.css */
.myButton {
  background-color: var(--ac-primary);
  color: var(--ac-primary-foreground);
  padding: 0.5rem 1rem;
}

.myButton:hover {
  background-color: color-mix(in oklch, var(--ac-primary) 90%, transparent);
}
```

**Impact:** Components no longer use Tailwind utility classes internally. Use CSS Modules for custom styling.

---

### 3. Composition Pattern Migration

**Before (v0.x):**

```tsx
<Button asChild>
  <a href='/dashboard'>Go to Dashboard</a>
</Button>
```

**After (v1.0):**

```tsx
<Button render={<a href='/dashboard' />}>Go to Dashboard</Button>
```

**Impact:** `asChild` still works as a backward-compatibility shim, but `render` is preferred.

---

### 4. Design Token Migration

**Before (v0.x):**

```css
:root {
  --ui-primary: 210 100% 50%;
  --ui-primary-foreground: 0 0% 100%;
  --ui-radius: 0.5rem;
}
```

**After (v1.0):**

```css
:root {
  --ac-primary: oklch(0.6 0.2 250);
  --ac-primary-foreground: oklch(1 0 0);
  --ac-radius-md: 0.5rem;
}
```

**Impact:** All CSS custom properties are prefixed with `--ac-*` and use OKLCH color space.

---

### 5. Variant Helper Migration

**Before (v0.x):**

```tsx
import {buttonVariants} from "@arolariu/components/button";
import {cva} from "class-variance-authority";

const variants = buttonVariants({variant: "destructive", size: "lg"});
// Returns: "bg-destructive text-destructive-foreground hover:bg-destructive/90 h-11 px-8"
```

**After (v1.0):**

```tsx
import {buttonVariants} from "@arolariu/components/button";

const variants = buttonVariants({variant: "destructive", size: "lg"});
// Returns: "destructive sizeLg" (CSS Module class names)
```

**Impact:** Variant helpers return CSS Module class names, not Tailwind utilities. Use with `cn()` for merging.

---

### 6. Removed Dependencies

**Before (v0.x):**

```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "tailwindcss": "^3.4.0",
    "tailwind-merge": "^2.0.0",
    "class-variance-authority": "^0.7.0",
    "sonner": "^1.0.0",
    "cmdk": "^0.2.0",
    "vaul": "^0.9.0"
  }
}
```

**After (v1.0):**

```json
{
  "dependencies": {
    "@base-ui/react": "^0.0.1"
  }
}
```

**Impact:** Removed 28+ dependencies. Library is now much lighter.

---

## 📝 Step-by-Step Migration

### 1. Update Dependencies

```bash
# Uninstall old version
npm uninstall @arolariu/components

# Install new version
npm install @arolariu/components@1.0.0

# Update peer dependencies
npm install react@^19.0.0 react-dom@^19.0.0 @base-ui/react@^0.0.1 motion@^11.0.0
```

**Optional Dependencies (if using specific features):**

```bash
# For forms with validation
npm install react-hook-form @hookform/resolvers zod

# For charts
npm install recharts
```

---

### 2. Remove Radix UI Packages

If you were importing Radix UI directly in your app:

```bash
# Remove all Radix UI packages
npm uninstall @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-popover
# ... (and any other @radix-ui packages)
```

**Search and replace** in your codebase:

```tsx
// Find all direct Radix UI imports
import * as Dialog from "@radix-ui/react-dialog";
// Replace with Base UI imports
import {Dialog} from "@base-ui/react/dialog";
```

---

### 3. Update Imports

**Before (v0.x):**

```tsx
import "@arolariu/components/dist/index.css"; // Old path
import {Button} from "@arolariu/components";
```

**After (v1.0):**

```tsx
import "@arolariu/components/styles"; // New path (design tokens only)
import {Button} from "@arolariu/components/button"; // Subpath imports preferred
```

**Bulk import update:**

```tsx
// Still works but not recommended for tree-shaking
import {Button, Card, Dialog} from "@arolariu/components";

// Preferred: subpath imports
import {Button} from "@arolariu/components/button";
import {Card, CardHeader, CardContent} from "@arolariu/components/card";
import {Dialog, DialogTrigger, DialogContent} from "@arolariu/components/dialog";
```

---

### 4. Migrate from Tailwind to CSS Modules

**Before (v0.x): Tailwind utility classes**

```tsx
<Card className='w-96 p-6 bg-card text-card-foreground shadow-lg'>
  <h2 className='text-xl font-bold mb-4'>Title</h2>
  <p className='text-sm text-muted-foreground'>Description</p>
</Card>
```

**After (v1.0): CSS Modules**

```tsx
import styles from "./my-card.module.css";

<Card className={styles.card}>
  <h2 className={styles.title}>Title</h2>
  <p className={styles.description}>Description</p>
</Card>;
```

```css
/* my-card.module.css */
.card {
  width: 24rem;
  padding: 1.5rem;
  background-color: var(--ac-card);
  color: var(--ac-card-foreground);
  box-shadow: var(--ac-shadow-lg);
}

.title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.description {
  font-size: 0.875rem;
  color: var(--ac-muted-foreground);
}
```

**Strategy:** Create a CSS Module file for each component or page and migrate utility classes to semantic class names.

---

### 5. Replace `asChild` with `render`

**Before (v0.x):**

```tsx
import { Button } from "@arolariu/components/button";

<Button asChild>
  <a href="/dashboard">Dashboard</a>
</Button>

<Dialog.Trigger asChild>
  <Button>Open Dialog</Button>
</Dialog.Trigger>
```

**After (v1.0):**

```tsx
import { Button } from "@arolariu/components/button";
import { Dialog, DialogTrigger } from "@arolariu/components/dialog";

<Button render={<a href="/dashboard" />}>
  Dashboard
</Button>

<DialogTrigger render={<Button />}>
  Open Dialog
</DialogTrigger>
```

**Note:** `asChild` still works in v1.0 as a backward-compatibility shim, but it's deprecated. Use `render` for new code.

---

### 6. Update Design Tokens

**Step 1: Find all custom token definitions**

```bash
# Search for old token prefix
grep -r "--ui-" ./styles
```

**Step 2: Rename tokens**

**Before (v0.x):**

```css
:root {
  --ui-primary: 210 100% 50%;
  --ui-primary-foreground: 0 0% 100%;
  --ui-secondary: 220 14% 96%;
  --ui-accent: 210 100% 95%;
  --ui-radius: 0.5rem;
}

.dark {
  --ui-primary: 210 100% 45%;
}
```

**After (v1.0):**

```css
:root {
  --ac-primary: oklch(0.6 0.2 250);
  --ac-primary-foreground: oklch(1 0 0);
  --ac-secondary: oklch(0.96 0.01 250);
  --ac-accent: oklch(0.95 0.05 250);
  --ac-radius-md: 0.5rem;
}

.dark,
[data-theme="dark"] {
  --ac-primary: oklch(0.55 0.18 250);
}
```

**Step 3: Convert HSL to OKLCH**

Use the color conversion utilities:

```tsx
import {convertHexToOklchString} from "@arolariu/components/color-conversion-utilities";

// Convert existing colors
const oklch = convertHexToOklchString("#3b82f6");
console.log(oklch); // "oklch(0.6 0.2 250)"
```

**Common token mappings:**

| v0.x              | v1.0              | Description            |
| ----------------- | ----------------- | ---------------------- |
| `--ui-primary`    | `--ac-primary`    | Primary brand color    |
| `--ui-radius`     | `--ac-radius-md`  | Border radius (medium) |
| `--ui-spacing-4`  | `--ac-spacing-md` | Spacing scale          |
| `--ui-foreground` | `--ac-foreground` | Main text color        |
| `--ui-muted`      | `--ac-muted`      | Muted background       |

---

### 7. Migrate Variant Helpers

**Before (v0.x): CVA-based variants**

```tsx
import {buttonVariants} from "@arolariu/components/button";

const className = buttonVariants({variant: "outline", size: "lg"});
// Returns Tailwind classes: "border border-input bg-background hover:bg-accent h-11 px-8"

<a className={className}>Link as Button</a>;
```

**After (v1.0): CSS Module class maps**

```tsx
import {buttonVariants} from "@arolariu/components/button";
import {cn} from "@arolariu/components/utilities";
import styles from "./my-link.module.css";

const className = cn(buttonVariants({variant: "outline", size: "lg"}), styles.myLink);
// Returns CSS Module classes: "outline sizeLg myLink"

<a className={className}>Link as Button</a>;
```

**CSS Module:**

```css
/* my-link.module.css */
.myLink {
  text-decoration: none;
  display: inline-flex;
}
```

---

### 8. Update Toast Usage

**Before (v0.x): Sonner toast**

```tsx
import {toast} from "sonner";

toast.success("Success!");
toast.error("Error!");
toast.promise(promise, {
  loading: "Loading...",
  success: "Done!",
  error: "Failed!",
});
```

**After (v1.0): Base UI Toast-backed implementation**

```tsx
import {toast} from "@arolariu/components/sonner";

// API is identical, but implementation uses Base UI
toast.success("Success!");
toast.error("Error!");
toast.promise(promise, {
  loading: "Loading...",
  success: "Done!",
  error: "Failed!",
});
```

**Setup:**

```tsx
import {Toaster} from "@arolariu/components/sonner";

// Add once in app root
<Toaster />;
```

**Impact:** No API changes, but the underlying implementation is now Base UI-backed.

---

### 9. Update Command Palette

**Before (v0.x): cmdk package**

```tsx
import {Command, CommandInput, CommandList, CommandItem} from "@arolariu/components/command";

<Command>
  <CommandInput placeholder='Search...' />
  <CommandList>
    <CommandItem onSelect={() => console.log("Selected")}>Option 1</CommandItem>
  </CommandList>
</Command>;
```

**After (v1.0): Native implementation**

```tsx
import {Command, CommandInput, CommandList, CommandItem} from "@arolariu/components/command";

// API is identical, but implementation is package-native
<Command>
  <CommandInput placeholder='Search...' />
  <CommandList>
    <CommandItem onSelect={() => console.log("Selected")}>Option 1</CommandItem>
  </CommandList>
</Command>;
```

**Impact:** No API changes, but the underlying implementation is now Base UI-aligned.

---

### 10. Update DropDrawer

**Before (v0.x): vaul package**

```tsx
import {DropDrawer} from "@arolariu/components/dropdrawer";

<DropDrawer>
  <DropDrawer.Trigger>Open Drawer</DropDrawer.Trigger>
  <DropDrawer.Content>
    <DropDrawer.Title>Drawer Title</DropDrawer.Title>
    <p>Content here</p>
  </DropDrawer.Content>
</DropDrawer>;
```

**After (v1.0): Base UI Drawer foundation**

```tsx
import {DropDrawer, DropDrawerTrigger, DropDrawerContent, DropDrawerTitle} from "@arolariu/components/dropdrawer";

<DropDrawer>
  <DropDrawerTrigger>Open Drawer</DropDrawerTrigger>
  <DropDrawerContent>
    <DropDrawerTitle>Drawer Title</DropDrawerTitle>
    <p>Content here</p>
  </DropDrawerContent>
</DropDrawer>;
```

**Impact:** API is similar, but imports may need to be updated to use compound components.

---

## 🔧 Component-Specific Changes

### Button

**Before (v0.x):**

```tsx
<Button
  variant='destructive'
  size='lg'
  asChild>
  <a href='/delete'>Delete</a>
</Button>
```

**After (v1.0):**

```tsx
<Button
  variant='destructive'
  size='lg'
  render={<a href='/delete' />}>
  Delete
</Button>
```

---

### Dialog

**Before (v0.x):**

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent className='max-w-md'>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogFooter>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**After (v1.0):**

```tsx
import styles from "./my-dialog.module.css";

<Dialog>
  <DialogTrigger render={<Button />}>Open</DialogTrigger>
  <DialogContent className={styles.content}>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    <DialogFooter>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>;
```

```css
/* my-dialog.module.css */
.content {
  max-width: 28rem;
}
```

---

### Form

**Before (v0.x):**

```tsx
<FormField
  control={form.control}
  name='email'
  render={({field}) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input
          {...field}
          type='email'
          className='w-full'
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**After (v1.0):**

```tsx
import styles from "./my-form.module.css";

<FormField
  control={form.control}
  name='email'
  render={({field}) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input
          {...field}
          type='email'
          className={styles.input}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>;
```

```css
/* my-form.module.css */
.input {
  width: 100%;
}
```

---

### Table

**Before (v0.x):**

```tsx
<Table className='w-full'>
  <TableHeader>
    <TableRow>
      <TableHead className='w-[100px]'>ID</TableHead>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className='font-medium'>001</TableCell>
      <TableCell>John Doe</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

**After (v1.0):**

```tsx
import styles from "./my-table.module.css";

<Table className={styles.table}>
  <TableHeader>
    <TableRow>
      <TableHead className={styles.idColumn}>ID</TableHead>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell className={styles.idCell}>001</TableCell>
      <TableCell>John Doe</TableCell>
    </TableRow>
  </TableBody>
</Table>;
```

```css
/* my-table.module.css */
.table {
  width: 100%;
}

.idColumn {
  width: 6.25rem;
}

.idCell {
  font-weight: 500;
}
```

---

### Select

**Before (v0.x):**

```tsx
<Select>
  <SelectTrigger className='w-[180px]'>
    <SelectValue placeholder='Select option' />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value='option1'>Option 1</SelectItem>
    <SelectItem value='option2'>Option 2</SelectItem>
  </SelectContent>
</Select>
```

**After (v1.0):**

```tsx
import styles from "./my-select.module.css";

<Select>
  <SelectTrigger className={styles.trigger}>
    <SelectValue placeholder='Select option' />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value='option1'>Option 1</SelectItem>
    <SelectItem value='option2'>Option 2</SelectItem>
  </SelectContent>
</Select>;
```

```css
/* my-select.module.css */
.trigger {
  width: 11.25rem;
}
```

---

## 🐛 Troubleshooting

### Issue: Components have no styling

**Cause:** Missing design token import.

**Solution:**

```tsx
// Add this once in your app entry point
import "@arolariu/components/styles";
```

---

### Issue: Tailwind classes not working on components

**Cause:** Components no longer use Tailwind internally in v1.0.

**Solution:** Use CSS Modules instead:

```tsx
import styles from "./my-styles.module.css";

<Button className={styles.myButton}>Click</Button>;
```

---

### Issue: `asChild` prop not working

**Cause:** `asChild` is deprecated in v1.0. It works as a backward-compatibility shim but may have edge cases.

**Solution:** Migrate to `render` prop:

```tsx
// Old
<Button asChild>
  <a href="/link">Link</a>
</Button>

// New
<Button render={<a href="/link" />}>
  Link
</Button>
```

---

### Issue: Variant helpers return wrong classes

**Cause:** Variant helpers now return CSS Module class names, not Tailwind utilities.

**Solution:** Use `cn()` to merge classes:

```tsx
import {buttonVariants} from "@arolariu/components/button";
import {cn} from "@arolariu/components/utilities";

const className = cn(buttonVariants({variant: "outline"}), "my-custom-class");
```

---

### Issue: Dark mode not working

**Cause:** Dark mode selector changed in v1.0.

**Solution:** Use `.dark` class or `[data-theme="dark"]` attribute:

```tsx
// Option 1: Class-based
<html className="dark">

// Option 2: Attribute-based
<html data-theme="dark">
```

---

### Issue: TypeScript errors on component props

**Cause:** v1.0 uses namespace types (`Component.Props`, `Component.State`).

**Solution:** Update type imports:

```tsx
// Old
import {ButtonProps} from "@arolariu/components/button";

// New
import {Button} from "@arolariu/components/button";
type ButtonProps = Button.Props;
```

---

### Issue: Missing components after upgrade

**Cause:** Some components were renamed or removed.

**Solution:** Check the [CHANGELOG.md](./CHANGELOG.md) for component renames. New components in v1.0:

- `NumberField`
- `Meter`
- `Toolbar`
- `CheckboxGroup`

---

### Issue: Build errors with CSS Modules

**Cause:** CSS Module support not configured in bundler.

**Solution:** Ensure your bundler supports CSS Modules:

**Next.js:** Built-in support, no config needed.

**Vite:**

```ts
// vite.config.ts
export default {
  css: {
    modules: {
      localsConvention: "camelCaseOnly",
    },
  },
};
```

**Webpack:**

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.module\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
};
```

---

## 📚 Additional Resources

- [README.md](./README.md) - Component catalog and quick start
- [EXAMPLES.md](./EXAMPLES.md) - Real-world usage patterns
- [CHANGELOG.md](./CHANGELOG.md) - Full release history
- [Base UI Documentation](https://base-ui.com/react/components)
- [CSS Modules Guide](https://github.com/css-modules/css-modules)
- [OKLCH Color Space](https://oklch.com/)

---

## 🤝 Need Help?

- 🐛 [Report a bug](https://github.com/arolariu/arolariu.ro/issues)
- 💬 [Ask a question](https://github.com/arolariu/arolariu.ro/discussions)
- 📧 [Email support](mailto:admin@arolariu.ro)

---

**Happy migrating! 🎉**
