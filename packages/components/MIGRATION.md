# Migration Guide

## v2.4 to v3

This section covers the breaking changes from 2.4 to **3.0.0**. Install a published release from npm; do not point an application at this
workspace's source or `dist`.

The historical v0.x → v1.0 guide follows this section unchanged. Its old dependency ranges and examples are historical, not instructions for
adopting v3. In particular, its `<Button render={<a … />}>` link examples are superseded: in v3, links are native `<a>` elements styled with
`buttonVariants()` (see [Button](#button)).

### How to use this guide

The guide is organized for both people and automated agents:

1. [Quick start](#quick-start) lists the upgrade steps and the searches that locate affected code.
2. [Global changes](#global-changes) apply to every application, whichever components it renders.
3. [Removed APIs](#removed-apis) maps every deleted export or prop to its replacement.
4. [Breaking changes by component](#breaking-changes-by-component) has one alphabetical section per component family or hook. Each section
   uses the same four labels: **What changed**, **Before → after**, **Why** and **Find usages**.
5. [Changed defaults at a glance](#changed-defaults-at-a-glance) summarizes the defaults that change runtime behavior without a type error.

Search patterns are regular expressions for `rg` (ripgrep); `git grep -nE` accepts the same patterns. Run them from the application's source
root.

### Quick start

1. Upgrade the peers: `react` and `react-dom` to `^19`, `@base-ui/react` to `^1.9`, then install the published `@arolariu/components@3`.
2. Run the type checker. Removed props, naming unions (Button, Carousel) and removed exports fail at compile time; fix them with the linked
   component sections.
3. Run every search in the table below and migrate each hit with its section.
4. Decide every row of [Changed defaults at a glance](#changed-defaults-at-a-glance) explicitly: these compile unchanged but behave
   differently.
5. Localize every generated accessible name the components you render now expose (`closeLabel`, `fallbackLabel`, `launchLabel`,
   `revealLabel`, `decreaseLabel`, …).
6. Re-run the application's tests and the manual browser and assistive-technology checks in
   [ACCESSIBILITY.md](./ACCESSIBILITY.md#verification-boundary).

| Search (`rg -n`)                                                                                                                   | Finds                                                  | Section                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------- |
| `asChild`                                                                                                                          | Removed slot props                                     | [Removed APIs](#removed-apis)                                     |
| `toast(\.(success\|error\|info\|warning\|loading\|dismiss\|custom\|getToasts\|getHistory))?\(`                                     | Callable toast facade                                  | [Toast](#toast)                                                   |
| `<Toaster`                                                                                                                         | Toaster options and the persistent default             | [Toast](#toast)                                                   |
| `CommandDialog`                                                                                                                    | The removed automatic Command root                     | [Command](#command)                                               |
| `AlertDialogAction`                                                                                                                | The removed automatic close                            | [AlertDialog](#alertdialog)                                       |
| `extends (ButtonProps\|InputGroupButtonProps\|AlertDialogActionProps\|SidebarTriggerProps\|CarouselProps)`                         | Interfaces over naming unions (TS2312)                 | [Button](#button), [Carousel](#carousel)                          |
| `render=\{<a\b`                                                                                                                    | Links rendered through Button                          | [Button](#button)                                                 |
| `size=["{]['"]?icon`                                                                                                               | Icon buttons that now need a name                      | [Button](#button)                                                 |
| `buttonVariants\|badgeVariants\|markerVariants\|tabsListVariants\|toggleVariants\|navigationMenuTriggerStyle\|buttonGroupVariants` | Class helpers called from Server Components            | [Global changes](#client-and-server-boundaries)                   |
| `<Accordion\b[^>]*\btype=`                                                                                                         | Scalar/`type` Accordion values                         | [Accordion](#accordion)                                           |
| `indeterminate`                                                                                                                    | Checkbox `checked="indeterminate"`                     | [Checkbox](#checkbox)                                             |
| `delayDuration\|TooltipProvider`                                                                                                   | Removed delay alias, real provider timing              | [Tooltip and HoverCard](#tooltip-and-hovercard)                   |
| `PopoverAnchor\|NavigationMenuViewport\|NavigationMenuIndicator\|positionMethod`                                                   | Removed compatibility parts                            | [Removed APIs](#removed-apis)                                     |
| `hexToHsl\|hslToHex\|isValidHexColor\|getComplementaryColor\|adjustLightness\|parseHslString\|convertHslToHexString`               | Color utilities                                        | [Color utilities](#color-utilities)                               |
| `"righ"`                                                                                                                           | Flip's misspelled direction                            | [Visual effects and motion](#visual-effects-and-motion)           |
| `\bCell\b`                                                                                                                         | The removed Recharts `Cell` re-export                  | [Chart](#chart)                                                   |
| `<Carousel\b`                                                                                                                      | Carousels that need a region name                      | [Carousel](#carousel)                                             |
| `Skeleton`                                                                                                                         | Count validation and the two-pulse default             | [Skeleton and Spinner](#skeleton-and-spinner)                     |
| `ScrollArea\|ScrollBar`                                                                                                            | The stable gutter and mounted track                    | [ScrollArea](#scrollarea)                                         |
| `<(Dialog\|Sheet)\b[^>]*modal=`                                                                                                    | Non-modal dialogs that relied on the backdrop          | [Dialog and Sheet](#dialog-and-sheet)                             |
| `Combobox`                                                                                                                         | Removed automatic search/list/empty block              | [Combobox](#combobox)                                             |
| `ContextMenuContent\|DropdownMenuContent\|MenubarContent`                                                                          | Placement defaults                                     | [Menus](#menus)                                                   |
| `ResizableHandle`                                                                                                                  | Generated step buttons                                 | [Resizable](#resizable)                                           |
| `SidebarProvider\|SidebarMenuButton\|SidebarMenuSubButton`                                                                         | `aria-current`, the close control and the state cookie | [Sidebar](#sidebar)                                               |
| `useFocusManager\|FocusScope`                                                                                                      | Candidate filtering and `aria-disabled` tab stops      | [FocusScope and useFocusManager](#focusscope-and-usefocusmanager) |

### Global changes

#### Dependency and packaging decision

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
- `npm test` verifies the built package and a real packed archive: ESM, declarations, CSS, client directives and private-import rejection
  (see [Verification and limits](#verification-and-limits)). Physical-browser and assistive-technology verification remain separate.

#### Client and server boundaries

- `async-boundary`, `badge`, `breadcrumb`, `empty` and `item` are now `"use client"` modules (2.4's were directive-free), so a Server
  Component can pass their parts only serializable props (no `render` or `className` callbacks). `field`, `loading-overlay` and `pagination`
  no longer carry `"use client"` and render on the server when a Server Component imports them.
- The pure class helpers `badgeVariants`, `buttonVariants`, `buttonGroupVariants`, `markerVariants`, `navigationMenuTriggerStyle`,
  `tabsListVariants` and `toggleVariants` live in directive-free modules that the package root re-exports. Call them in a Server Component
  only through `import {buttonVariants} from "@arolariu/components"`. Component subpaths such as `@arolariu/components/button` re-export the
  same functions from `"use client"` modules, where they are client references, so import them from a subpath only in Client Components. A
  Server Component that called `badgeVariants` from `@arolariu/components/badge` must switch to the root import.

#### Refs, render props and primitive state

- Receive DOM `ref` as an ordinary typed React 19 prop. Preserve cleanup-returning callback refs and object-ref targets in custom render
  components. Repeated merged-ref identities attach once, retained refs survive reordering, and obsolete disposers cannot detach new nodes.
- `asChild` and the deprecated aliases are removed rather than retained behind another alias. Replace old slots with `render`; set
  `nativeButton={false}` when a button-like primitive renders a non-button element that takes button semantics (for example a `<div>`).
  Links are not button targets: render them as native `<a>` elements styled with `buttonVariants()`.
- Primitive render/class callbacks: wrappers no longer evaluate these through a stateless outer renderer. Callback props/state belong to the
  actual primitive and callback refs are merged callbacks, not assumed mutable ref objects. Preserve forwarded props/ref and use actual
  state, event details and cancellation.
- Automatic NavigationMenu and Drawer anatomy survives React Flight: opaque render elements passed from Server Components are transported,
  not re-created.

#### Accessibility and visual behavior

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

#### Public names and collision rules

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

### Removed APIs

| Removed surface                                                                                                                         | Canonical replacement                                                        | Section                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| All `asChild` props                                                                                                                     | `render` plus the primitive's native/composed-element contract               | [Refs and render props](#refs-render-props-and-primitive-state) |
| Callable `toast()` facade and its status helpers (`toast.success`, `toast.dismiss`, …)                                                  | `Toaster`, `toast.add/update/close/promise` or explicit Toast compound parts | [Toast](#toast)                                                 |
| CommandDialog's automatic `Command` root                                                                                                | `CommandDialog` containing one explicit `Command`                            | [Command](#command)                                             |
| `AlertDialogAction`'s automatic close                                                                                                   | `AlertDialogAction` with caller-owned successful close                       | [AlertDialog](#alertdialog)                                     |
| Accordion scalar values and `type` adapters                                                                                             | Array values in both single- and multiple-panel modes; native `multiple`     | [Accordion](#accordion)                                         |
| Checkbox `checked="indeterminate"`                                                                                                      | Boolean `checked` plus explicit `indeterminate`                              | [Checkbox](#checkbox)                                           |
| Tooltip root/provider `delayDuration` (v2.4 ignored it on both: the provider was a pass-through, and Base UI 1.x's Root has no `delay`) | Native provider or trigger `delay`                                           | [Tooltip and HoverCard](#tooltip-and-hovercard)                 |
| NavigationMenuViewport/Indicator compatibility parts                                                                                    | NavigationMenuPositioner and its explicit viewport props                     | [NavigationMenu](#navigationmenu)                               |
| Structural PopoverAnchor                                                                                                                | A measurable Content `anchor`                                                | [Popover](#popover)                                             |
| ContextMenu's deprecated `positionMethod`                                                                                               | Native context-menu positioning options                                      | [Menus](#menus)                                                 |
| Breadcrumb `separator`, Separator `decorative` and other legacy no-op props                                                             | Explicit parts/native semantics                                              | [Breadcrumb and Item](#breadcrumb-and-item)                     |
| Branch-ambiguous DropDrawer handles                                                                                                     | Branch-specific menu/drawer configuration                                    | [DropDrawer](#dropdrawer)                                       |
| Flip direction `"righ"`                                                                                                                 | `"right"`                                                                    | [Visual effects and motion](#visual-effects-and-motion)         |
| `hexToHsl`, `hslToHex`, `isValidHexColor`, `getComplementaryColor`, `adjustLightness`, `parseHslString`                                 | Canonically named color utilities                                            | [Color utilities](#color-utilities)                             |
| Recharts `Cell` reexport                                                                                                                | A series `shape`                                                             | [Chart](#chart)                                                 |

Source, declarations, root exports and component subpaths no longer expose these surfaces. Old before-examples below explain migration, not
a compatibility option.

### Breaking changes by component

#### Accordion

**What changed:** Values and callbacks are string arrays in both single- and multiple-panel modes. An empty array selects nothing; an array
containing the empty string selects that item. `collapsible={false}` cancels empty proposals using the original event details. Each trigger
renders inside Base UI's Header, an `<h3>` by default that now carries `data-slot="accordion-header"`. Trigger hover text uses
`--ac-primary-emphasis`.

**Before → after:** `<Accordion type='single' value='a'>` becomes `<Accordion value={["a"]}>`; `type='multiple'` becomes the native
`multiple` prop. Pass `headerProps={{render: <h2 />}}` (typed `AccordionHeaderProps` or `AccordionTrigger.HeaderProps`) when `<h3>` does not
continue the page outline.

**Why:** Base UI's Accordion owns a single array-valued state; the scalar/`type` adapter converted values and lost event details.
Applications own the heading level.

**Find usages:** `rg -n "<Accordion\b[^>]*\b(type|value|defaultValue)="`

#### Alert, Empty and other native display parts

**What changed:** AlertTitle remains `h5`. Alert keeps normal flow for free-form children; the new `AlertAction` (`AlertActionProps`,
`AlertAction.Props`), as a direct child, switches it to a two-column grid (the action in the trailing column, every other element child in
the message column). `EmptyDescription` composes through Base UI `useRender` (default `<p>`); caller props, including `data-slot`, are
applied last, and render callbacks receive `EmptyDescriptionState` (`EmptyDescription.State`). The `empty` module is now a client module
(v2.4's was server-compatible), like Badge, Marker and BubbleContent; Server Components can still render every part. Kbd/group remain native
`kbd`; Table remains a real table with its horizontal wrapper. Plain nested links in Alert and Empty descriptions inherit the text colour
and are underlined (see [Accessibility and visual behavior](#accessibility-and-visual-behavior)).

**Before → after:** wrap loose text in `AlertDescription` when an `AlertAction` is present; compose block content with
`<EmptyDescription render={<div />}>`.

**Why:** a grid split free-form children into cells; `render` replaces ad hoc block wrappers with the shared composition contract.

**Find usages:** `rg -n "AlertAction|EmptyDescription"`

#### AlertDialog

**What changed:** `AlertDialogAction` is an ordinary Button and does not close the dialog. Cancel remains Close-backed. Base UI retains
Escape and outside-dismissal policy through original cancellable details. `AlertDialogContent` accepts `portalProps` (`keepMounted`,
`container`). `AlertDialogActionProps` aliases `ButtonProps`, so it is a naming union (see [Button](#button)).

**Before → after:** explicitly close after successful asynchronous work and retain pending/rejection policies:

```tsx
const [open, setOpen] = React.useState(false);

<AlertDialog
  open={open}
  onOpenChange={setOpen}>
  …
  <AlertDialogAction
    onClick={async () => {
      await deleteItem();
      setOpen(false);
    }}>
    Delete
  </AlertDialogAction>
</AlertDialog>;
```

**Why:** an automatic close dismissed the confirmation before asynchronous work could fail, hiding the error from the user.

**Find usages:** `rg -n "AlertDialogAction"`

#### AsyncBoundary, ErrorBoundary and LoadingOverlay

**What changed:**

- An explicit `fallback={null}` stays empty.
- ErrorBoundary normalizes unknown thrown values to an `Error` with `cause`, keeping a thrown `Error` as the same object. A reset requires
  repaired descendants or a replaced rejected resource.
- AsyncBoundary is a Client Component and owns no fetch, cache or DOM ref. With the default fallback (a decorative spinner), a visually
  hidden `<span role="status">` follows its content for the boundary's whole lifetime, and `loadingLabel` is written into it while
  suspended.
- LoadingOverlay is visual and does not intercept input. The caller owns inert, disabled, busy and focus state, and keeps the overlay
  outside busy and inert subtrees. It always renders a persistent, visually hidden `role="status"` region (empty while hidden) and writes
  `loadingLabel` (default `"Loading"`) into it while `visible`. The overlay element has no role.
- The `async-boundary` module is a client module, and `loading-overlay` renders on the server (see
  [Client and server boundaries](#client-and-server-boundaries)).

**Before → after:** keep LoadingOverlay mounted and toggle `visible`; pass the loading message as `loadingLabel`, not `aria-label`. In list
or table contexts, where the `<span>` sibling does not fit the content model, pass a fitting `loadingFallback`, which renders no region. A
custom or `null` fallback owns its own announcement.

**Why:** a status region mounted before loading starts is announced reliably, and a boundary must not swallow the identity of real errors.

**Find usages:** `rg -n "AsyncBoundary|ErrorBoundary|LoadingOverlay"`

#### Badge

**What changed:** the default element/ref becomes `span` / `HTMLSpanElement`, not `div`. Composed refs follow the real element. Ghost/link
variants are additive. The `link` variant's text uses `--ac-primary-emphasis`, and default badges hover to a foreground mix. The `badge`
subpath is a client module, so call `badgeVariants` from the package root in Server Components (see
[Client and server boundaries](#client-and-server-boundaries)).

**Before → after:** use `render={<div />}` deliberately for block markup.

**Why:** a badge is phrasing content; a `div` inside paragraphs and buttons produced invalid HTML.

**Find usages:** `rg -n "<Badge\b|badgeVariants"`

#### Breadcrumb and Item

**What changed:** composed refs target `HTMLElement`; native parts retain their exact tags. Item's default `div` is noninteractive. The
Breadcrumb root `separator` prop is removed. The `breadcrumb` and `item` modules are client modules.

**Before → after:** `<Breadcrumb separator={<Slash />}>` becomes an explicit `<BreadcrumbSeparator><Slash /></BreadcrumbSeparator>` between
items.

**Why:** the root prop was a no-op compatibility flag; explicit parts keep the separators in the accessible list structure.

**Find usages:** `rg -n "<Breadcrumb\b[^>]*separator=|<Item\b"`

#### Button

**What changed:** `ButtonProps` is now a naming union. The icon sizes (`icon`, `icon-xs`, `icon-sm`, `icon-lg`) require a string
`aria-label` or `aria-labelledby`; visible or visually hidden text alone does not satisfy the type for those sizes. Because the props are a
union, `interface X extends ButtonProps` fails with TS2312 ("An interface can only extend an object type or intersection of object types
with statically known members"); declare an intersection type alias instead, such as `type X = ButtonProps & {…}`. The same applies to
`InputGroupButtonProps` (`ButtonProps` with its `ghost`/`xs` defaults documented), to `AlertDialogActionProps`, which aliases `ButtonProps`,
and to `SidebarTriggerProps`. Button adds `xs`, `icon-xs`, `icon-sm` and `icon-lg`; exhaustive consumer size maps must include them. Refs
truthfully target `HTMLElement` where composition permits non-button elements; native button refs remain usable.

**Before → after:**

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
the other variants never underline. Import `buttonVariants` from the package root to call it in a Server Component (see
[Client and server boundaries](#client-and-server-boundaries)).

**Why:** icon-only buttons without a name fail WCAG 4.1.2, and buttons that navigate break link semantics; the type system now catches both.

**Find usages:**
`rg -n "extends (ButtonProps|InputGroupButtonProps|AlertDialogActionProps|SidebarTriggerProps)|render=\{<a\b|size=[\"{]['\"]?icon"`

#### Calendar

**What changed:** DayPicker discriminated selection modes and primitive callbacks remain. Styled `classNames` append, except animation keys,
which are a **single replaced token**, not a merged class list. Custom components replace defaults, a custom Root must attach the merged
`rootRef`, and the locale-aware `CalendarDayButton` preserves native button refs. DayPicker names each day button through
`labels.labelDayButton`, so custom DayButton children are presentational. Without a `locale`, month-dropdown options and day labels use
DayPicker's own `en-US` default instead of the runtime locale.

**Before → after:** provide CSS for overridden animation tokens; put meaningful day content (events, availability) into
`labels.labelDayButton` and mark visual-only content `aria-hidden`; pass `locale` for localized output.

**Why:** the runtime locale differed between server and browser and caused hydration mismatches; day buttons keep one accessible name.

**Find usages:** `rg -n "<Calendar\b|CalendarDayButton|labelDayButton"`

#### Card

**What changed:** the Card root is a `flex` column and CardHeader is a grid (two columns when it contains CardAction). Spacing comes from
`--ac-card-spacing` (`1.5rem`, or `1rem` for `size="sm"`). CardContent that is the card's first child, with no CardHeader above it, gets top
padding equal to `--ac-card-spacing`.

**Before → after:** check cards whose CardContent comes first: they gain top padding. For flush content, set `--ac-card-spacing: 0` or a
`padding-top` override on the CardContent class. The first-child rule uses `:where()`, so a single consumer class overrides it with the same
cascade order as v2.4.

**Why:** content-only cards previously touched the top border.

**Find usages:** `rg -n "<Card(Content|Header)\b"`

#### Carousel

**What changed:** `CarouselProps` is a naming union: pass a localized `aria-label` or `aria-labelledby` (preferably the `id` of a visible
heading); v2.4 rendered an unnamed `role="region"`. `interface X extends CarouselProps` fails with TS2312. Under
`prefers-reduced-motion: reduce`, transitions are instant through a `duration: 0` the carousel adds to
`opts.breakpoints["(prefers-reduced-motion: reduce)"]` (keeping a caller entry's other options and outranking other breakpoints'
`duration`); the caller's or Embla's default `duration` returns when the preference clears. Embla options/plugins/API and the real
`useCarousel` context remain. Navigation refs follow Button's `HTMLElement` contract, and CarouselPrevious/CarouselNext default to the
`outline` variant.

**Before → after:** `<Carousel>` becomes `<Carousel aria-labelledby={headingId}>`; `interface X extends CarouselProps` becomes
`type X = CarouselProps & {…}`.

**Why:** an unnamed region is announced without context (WCAG 4.1.2), and sliding transitions ignored the reduced-motion preference.

**Find usages:** `rg -n "<Carousel\b|extends CarouselProps"`

#### Chart

**What changed:** ChartContainer `id`/`className`/`ref` belong to the native **outer root**, not ResponsiveContainer's optional measuring
div. Native `id`/`className` are strings. Generated `data-chart` scopes are internal unique IDs. Unsafe config color declarations are
omitted; nullish formatter output suppresses rows and default ranges use `~`. The Recharts `Cell` re-export is removed. Chart config
`stackId` is consumer metadata, not automatic series configuration; outer Recharts positioning/sorting/container props remain outer
responsibilities. Configure legend positioning/layout through the actual `ChartLegend`, not removed no-op custom-content props.
`ChartLegendContent` exposes its supported per-item callbacks only; engine-injected layout/presentation fields are consumed internally
instead of leaking to the DOM. `hideIndicator` keeps configured tooltip icons, and `hideIcon` replaces legend icons with swatches.
SDK-inactive legend items append the caller-owned `inactiveSuffix` (default `" (hidden)"`; `""`/`null` suppresses), which is visible and
part of clickable items' names. `initialDimension` defaults to `{width: 320, height: 200}`.

**Before → after:** use JSX content or callbacks returning JSX for ref-capable Tooltip/Legend content, not direct function invocation;
replace `<Cell fill=… />` children with a series `shape`; use native `id`/class/`data-slot` instead of the generated scope.

**Why:** attributes on the measuring div were dropped whenever Recharts skipped it, and invoked content could not receive refs.

**Find usages:** `rg -n "ChartContainer|ChartTooltipContent|ChartLegendContent|\bCell\b"`

#### Checkbox

**What changed:** `checked="indeterminate"` is removed. Checkbox, Switch and RadioGroupItem render Base UI's default `<span>` plus a hidden
native `<input>` instead of v2.4's `<button>`, and `nativeButton` now defaults to `false`.

**Before → after:** `<Checkbox checked='indeterminate' />` becomes `<Checkbox checked={false} indeterminate />`. Delete every bare
`nativeButton` on Checkbox, Switch and RadioGroupItem; keep it only together with `render={<button />}`.

**Why:** Base UI models the mixed state as an explicit boolean beside `checked`. A bare `nativeButton` on the default `<span>` drops Space/
Enter toggling and moves the caller's `id` off the hidden input, so `<Label htmlFor>` no longer targets the control. TypeScript cannot catch
this; it only fails at runtime.

**Find usages:** `rg -n "indeterminate"` and `rg -n "<(Checkbox|Switch|RadioGroupItem)\b[^>]*nativeButton"` (also check multi-line JSX)

#### Collapsible

**What changed:** open callbacks keep primitive event details; `details.trigger` is not synthesized when absent. Trigger render children are
retained.

**Before → after:** guard `details.trigger` before use.

**Why:** callbacks report what the primitive observed instead of fabricated fields.

**Find usages:** `rg -n "<Collapsible\b[^>]*onOpenChange"`

#### Color utilities

**What changed:** the deprecated aliases `hexToHsl`, `hslToHex`, `isValidHexColor`, `getComplementaryColor`, `adjustLightness` and
`parseHslString` are removed. `convertHslToHexString` now wraps the hue into `[0, 360)`, clamps saturation and lightness to `0`–`100` and
throws `RangeError` for a non-finite component; v2.4 produced malformed hex for out-of-range input and silently accepted `NaN`.
`convertHexToHslString` and the helpers built on it accept only 6-digit `#rrggbb` input (check with `validateHexColorFormat`).

**Before → after:**

| v2.4                    | v3                               |
| ----------------------- | -------------------------------- |
| `hexToHsl`              | `convertHexToHslString`          |
| `hslToHex`              | `convertHslToHexString`          |
| `isValidHexColor`       | `validateHexColorFormat`         |
| `getComplementaryColor` | `calculateComplementaryHexColor` |
| `adjustLightness`       | `adjustHexColorLightness`        |
| `parseHslString`        | `parseHslStringToComponents`     |

Validate user-supplied numbers before calling `convertHslToHexString`, or catch the `RangeError`.

**Why:** one canonical name per utility; out-of-range input now yields a valid colour instead of a malformed string.

**Find usages:** `rg -n "hexToHsl|hslToHex|isValidHexColor|getComplementaryColor|adjustLightness|parseHslString|convertHslToHexString"`

#### Combobox

**What changed:** there is no automatic search/List/Empty block, transient item-label registry or empty-string deselection. Root retains
generic object/number/multiple values. Single clearing yields `null`; multiple yields arrays. No legacy-combobox engine is added.
ComboboxEmpty's `role="status"` root stays mounted while rendered and only its children toggle; it collapses its padding while empty.
ComboboxContent defaults to `align="start"` and `sideOffset={6}` (Base UI: `"center"`, `0`).

**Before → after:** move root `placeholder`/`searchPlaceholder`/`emptyMessage`/`className` to explicit Value/Input/Empty/visual parts;
supply persistent Root `items`, an explicit `ComboboxList`, `ComboboxLabel` instead of a group heading and a root `filter`/data instead of
item keywords. Style ComboboxEmpty margins/borders with `:empty`/`:not(:empty)` and never hide it with `hidden`, `display: none`,
`aria-hidden` or conditional rendering.

**Why:** a persistent status region is announced reliably; explicit parts expose the real Base UI anatomy.

**Find usages:** `rg -n "<Combobox\b|ComboboxEmpty|searchPlaceholder|emptyMessage"`

#### Command

**What changed:** CommandDialog is **only the modal shell**. Supply exactly one explicit Command root; v2.4's CommandDialog created it
automatically.

**Before → after:**

```tsx
// Before: CommandDialog created the Command root implicitly.
<CommandDialog
  open={open}
  onOpenChange={setOpen}>
  <CommandInput placeholder='Search actions' />
  <CommandList>
    <CommandItem onSelect={copy}>Copy</CommandItem>
  </CommandList>
</CommandDialog>
```

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

**Why:** an explicit root makes the selected value, search state and filtering owner visible to the caller, and a status region outside the
listbox keeps "no results" announcements valid.

**Find usages:** `rg -n "CommandDialog|CommandEmpty|data-command|:first-child"`

#### Dialog and Sheet

**What changed:** the Content icon close defaults to visible (`showCloseButton` defaults to `true`); DialogFooter's optional close defaults
to `false`. Exported Close parts are unstyled. Automatic dismissal labels are caller-localizable (`closeLabel`). Sheet's automatic close
follows content. Content renders the page-blocking backdrop only when the root has `modal={true}` (the default): `modal={false}` and
`"trap-focus"` leave the page visible and pressable, and an outside press still dismisses unless `disablePointerDismissal`. `portalProps`
configures Content's internal Portal (`keepMounted`, `container`).

**Before → after:** pass `showCloseButton={false}` where the content already has its own close control; use `modal={true}` where a backdrop
is required; style exported Close parts yourself; compose only through `render`.

**Why:** every dialog gets a keyboard- and pointer-reachable dismissal by default, and the backdrop now matches the modality the primitive
enforces.

**Find usages:** `rg -n "<(Dialog|Sheet)\b[^>]*modal=|(Dialog|Sheet)Content|(Dialog|Sheet)Close"`

#### Drawer

**What changed:** the actual Viewport owns gestures, snap points and nesting. Only `modal={true}` has a blocking backdrop; non-modal and
trap-focus viewports do not. The default down/modal behavior remains; `showSwipeHandle` defaults to `false`, and the decorative
`DrawerSwipeHandle` stays outside Content. No snap point or list is invented. With vertical `snapPoints`, keyboard or programmatic focus on
a control that the active snap point keeps (even partly) off-screen requests the largest snap point through `onSnapPointChange` with
`reason: "none"`: uncontrolled drawers expand, controlled owners must apply or cancel the request. `DrawerContent` accepts `portalProps`.

**Before → after:** supply a snap point tall enough for every focusable control (for example `1`), or keep focusable controls within the
smallest snap height; handle `reason: "none"` in controlled `onSnapPointChange` owners.

**Why:** focus must never land on a control the user cannot see (WCAG 2.4.11).

**Find usages:** `rg -n "<Drawer\b|snapPoints|onSnapPointChange"`

#### DropDrawer

**What changed:** open state survives breakpoint changes; the submenu path resets and the new primitive owns focus. Mobile actions are
native buttons; desktop uses Menu. `closeOnClick` defaults to `true`, including submenu actions. Live registrations are not cached React
children. Desktop maps trap-focus to Menu modal mode; mobile follows Drawer backdrop rules. Shared states are engine unions.
Branch-ambiguous handles are removed. The new `presentation` prop chooses the owner: the default `"responsive"` switches at
`(max-width: 767px)` and server-renders the desktop Menu; `"menu"` and `"drawer"` force one owner, on the server too. Mobile `DropDrawerSub`
`onOpenChange` details support destructured `cancel()` and `allowPropagation()` like Base UI's, and the mobile Back and drill-down chevrons
mirror in RTL. On mobile, a submenu's drill-down panel heading, which also names the drawer dialog while that panel is active, comes from
`DropDrawerSub`'s localizable `title`, then the trigger's `label`, then its visible text (excluding `aria-hidden` and `hidden` content),
then the root `mobileTitle`. Desktop menus ignore it. DropDrawerContent (desktop) aligns to `end` by default.

**Before → after:** narrow shared states rather than assuming Menu highlighting on mobile; move branch-specific options to the menu or
drawer configuration; set `title` for icon-only, `aria-label`-named or badge/count triggers; derive a custom breakpoint with `useMediaQuery`
and `presentation`.

**Why:** each viewport uses one real primitive, so focus, semantics and server HTML are truthful.

**Find usages:** `rg -n "DropDrawer"`

#### FocusScope and useFocusManager

**What changed:** in FocusScope, natively focusable `aria-disabled` controls (Base UI `focusableWhenDisabled`, disabled toolbar roving
stops) are tab stops: Tab continues past them, and wrapping, `autoFocus` and focus restoration include them. A scope in a same-origin iframe
document looks up `HTMLElement`/`HTMLDetailsElement`/`HTMLFieldSetElement`/`HTMLLegendElement` from the element's own window. FocusScope is
local keyboard scope, not a modal engine; with `contain` (the default) the consumer provides and announces a keyboard exit (WCAG 2.1.2).
`useFocusManager` candidates also skip `aria-disabled`, hidden, `inert`, `display: none`/`visibility: hidden`, closed-`<details>` and
disabled-`<fieldset>` content (v2.4 skipped only `disabled` and negative-`tabindex` elements). `focusNext`/`focusPrevious` from a focused
element that is not a candidate continue to the nearest candidate after or before it in DOM order instead of jumping to the first or last
candidate; with focus outside the container, or on nothing, they still go to the first or last candidate, and moves past either end always
wrap.

**Before → after:** remove workarounds that skipped hidden or `inert` content manually; provide a visible exit from contained scopes.

**Why:** focus should only move to controls a user can perceive and operate.

**Find usages:** `rg -n "FocusScope|useFocusManager"`

#### Form and Field

**What changed:** `Form` remains RHF's provider (not a native `<form>`). FormControl preserves real element/event refs and child-first
cancellation; there is no implicit replacement of the RHF update handler. Only mounted meaningful description/message nodes get ARIA
references; blank/boolean/empty-fragment errors don't create empty messages, but numeric zero remains meaningful. Invalid fields can remain
invalid without text. Inline messages are not automatic alerts. Server HTML and the hydration render already carry the label/control
association and `aria-describedby`, derived from the FormLabel/FormControl/FormDescription/FormMessage elements written in the FormItem's
children (through fragments and wrapper elements, not nested items) and honoring explicit IDs. Limits: parts rendered internally by other
components link only once they mount, and server HTML links a generated description or message only when it is the item's single generated
part of that kind. Until hydration, server HTML can reference a written part that renders empty or not at all, and a written plus a
component-rendered generated description can share one ID. After hydration, mounted parts refine the links and generated IDs become unique.
A FormControl fallback wrapper merges caller `aria-describedby`/`aria-invalid` with the generated values.

**Before → after:** own one submission announcement; give additional descriptions or messages explicit IDs. The root `FieldError` is the
styled component; RHF's data type is `RHFFieldError` (see [Public names and collision rules](#public-names-and-collision-rules)).

**Why:** assistive technology receives only references to content that exists.

**Find usages:** `rg -n "FormControl|FormMessage|FormDescription|FieldError"`

#### Input, InputOTP, Textarea and Label

**What changed:** Input state/callbacks remain Base UI-owned. OTP invalid indexes fail fast; the active caret suppresses the placeholder,
and inactive empty slots retain the placeholder or `·`. Textarea and Label remain native and server-compatible; Textarea defaults to manual
resizing, with `data-sizing="content"` as CSS progressive enhancement, not a fabricated Base Textarea/autoresize API.

**Before → after:** remove autoresize props; opt into content sizing with `data-sizing="content"`.

**Why:** no invented API over a native element.

**Find usages:** `rg -n "InputOTPSlot|<Textarea\b"`

#### Menus

DropdownMenu, ContextMenu, Menubar and the desktop DropDrawer menu.

**What changed:** Popup render/class/ref/focus remain on Popup, positioning options on Positioner, portal options on Portal. Trigger refs
may be `HTMLElement`. Primitive checked/value/nativeButton/event details are not converted; submenu `inline-end` is RTL-aware. ContextMenu's
deprecated `positionMethod` is removed. The props document the deliberate placement defaults (side/align/sideOffset/alignOffset):
DropdownMenuContent unset/start/4/0; DropdownMenuSubContent and MenubarSubContent inline-end/start/0/−3; MenubarContent unset/start/8/−4;
ContextMenuContent inline-end/start/0/4; DropDrawerContent (desktop) align `end`; NavigationMenuPositioner bottom/start/8/0; PopoverContent
and TooltipContent `sideOffset` 4; HoverCardContent offsets 4/4. DropdownMenuContent and MenubarContent leave `side` unset unless provided,
so Base UI opens root menus below the trigger and vertical Menubar menus toward the inline end. ContextMenuContent defaults to the logical
`side="inline-end"` (left in RTL; the popup reports `data-side="inline-end"`); v2.4 passed no placement, so Base UI's context-menu default
applied (with Base UI 1.9: `data-side="bottom"`, start alignment, side offset −5 and align offset 2). Destructive items use the
contrast-safe text mix. Menu roots write `dir="rtl"` only under an RTL `DirectionProvider` (see
[Public names and collision rules](#public-names-and-collision-rules)).

**Before → after:** pass `side='bottom'` with `sideOffset={-5}` and `alignOffset={2}` to ContextMenuContent to keep v2.4's placement; wrap
RTL apps in `DirectionProvider direction="rtl"`.

**Why:** logical placement mirrors correctly in RTL, and destructive text keeps 4.5:1 contrast.

**Find usages:** `rg -n "(ContextMenu|DropdownMenu|Menubar)(Sub)?Content|positionMethod"`

#### NavigationMenu

**What changed:** Root supplies an automatic positioned Popup/Viewport, including opaque Flight render elements. The Viewport/Indicator
compatibility adapters are removed. Mark the current page's link with `active` (Base UI adds `aria-current="page"`); it draws a 2px
underline besides the hover tint. `navigationMenuTriggerStyle` is callable from the package root in Server Components.

**Before → after:** set `positionerProps={false}` for explicit `NavigationMenuPositioner` composition instead of
`NavigationMenuViewport`/`NavigationMenuIndicator`.

**Why:** the positioner is the real Base UI anatomy; the current page is not identified by colour alone.

**Find usages:** `rg -n "NavigationMenuViewport|NavigationMenuIndicator|NavigationMenuLink"`

#### Pagination

**What changed:** PaginationPrevious / PaginationNext are named by their visible `text` (`"Previous"` / `"Next"`); v2.4 named them
`"Go to previous page"` / `"Go to next page"`. The `pagination` module renders on the server.

**Before → after:** pass a localized `text`.

**Why:** the accessible name contains the visible label (WCAG 2.5.3).

**Find usages:** `rg -n "Pagination(Previous|Next)"`

#### Popover

**What changed:** the structural `PopoverAnchor` adapter is removed. Header owns layout; Title and Description own accessible registration.

**Before → after:** supply Content `anchor` with a measurable element or ref.

**Why:** Base UI positions against a measured element, not a structural wrapper.

**Find usages:** `rg -n "PopoverAnchor"`

#### Progress and Slider

**What changed:** Progress: omitted/null values are primitive indeterminate state, not coerced to zero. Root children are retained. Four
explicit parts replace the convenience track when a direct local/Base UI track is supplied; Value formatting belongs to the primitive.
Slider: a scalar stays scalar; readonly/mutable ranges retain primitive inference and one thumb per supplied endpoint, including zero for an
empty range. An omitted default is the primitive's single minimum, not an invented range. The Progress, Meter and Slider range fills use
`--ac-primary-emphasis`.

**Before → after:** pass `value={0}` where a determinate empty bar is intended; keep `(value, details)` change/commit callbacks and native
named inputs.

**Why:** an unknown progress value must be announced as indeterminate, not as 0%.

`Progress` `className` now styles the Root, not the Track as in v2.4; the automatic track keeps its own `0.5rem` height. To restyle the bar,
compose `<Progress value={v}><ProgressTrack className='bar'><ProgressIndicator /></ProgressTrack></Progress>`.

**Find usages:** `rg -n "<(Progress|Slider)\b"`

#### Resizable

**What changed:** Resizable remains the installed react-resizable-panels v4 Group/Panel/Separator with primitive imperative
handles/callbacks. `ResizableHandle` renders native −/+ step buttons after each separator (two extra tab stops;
`decreaseLabel`/`increaseLabel`/`resizeStep`), placed at least 11px clear of the 1px separator so presses never start a drag while the
group's `resizeTargetMinimumSize` is at most 22px, with `data-slot` hooks `resizable-controls`/`resizable-decrease`/`resizable-increase`. In
vertical groups − sits above and + below the line. The controls container carries react-resizable-panels' `data-resize-preview` marker so it
never changes separator hit regions; separator presses keep focus, the `active` state and double-click reset.

**Before → after:** use percentage-string constraints and primitive orientation state, not old ad hoc selectors; localize the step labels;
opt out with `withControls={false}` only alongside another single-pointer resize alternative; scope any `[data-resize-preview]` styling to
the primitive's preview overlays; reposition the controls through the hooks if you widen the separator or hit area.

**Why:** dragging must have a single-pointer alternative (WCAG 2.5.7).

**Find usages:** `rg -n "ResizableHandle|data-resize-preview"`

#### ScrollArea

**What changed:** `ScrollBar` keeps its 24px (1.5rem) track mounted by default (`keepMounted` defaults to `true`). While its axis fits, the
track stays in the DOM but is hidden and paints nothing. Whenever a package-styled track is mounted, the viewport (now
`box-sizing: border-box`) reserves a stable 1.5rem gutter plus scroll padding (inline-end for vertical, block-end for horizontal), present
in server HTML and independent of overflow. Content is therefore 1.5rem narrower or shorter even without overflow, and the gutter replaces
the viewport's own end padding on that axis. The convenience `ScrollArea` always reserves the vertical gutter. Explicit
Root/Viewport/Content/Thumb/Corner parts support sibling axis scrollbars and actual viewport refs.

**Before → after:** code or tests that expected an idle track to be absent must check `visibility`; pad `ScrollAreaContent` instead of the
viewport; to opt out, compose `ScrollAreaRoot` with `<ScrollBar keepMounted={false} />`, which restores mount-on-overflow (the gutter then
appears after hydration and can oscillate for width-dependent content). Restyled tracks wider than 1.5rem need a matching gutter.

**Why:** a stable gutter prevents layout shift after hydration and flip-flopping for width-dependent content.

**Find usages:** `rg -n "ScrollArea|ScrollBar"`

#### Select

**What changed:** Root retains generic object/number/multiple values and nullable single selection, with original `(value, details)`,
equality, cancellation and clear semantics.

**Before → after:** do not filter callbacks into old string-only values; name the listbox with `listProps`, not only the Popup's label.

**Why:** callbacks report the primitive's real values.

**Find usages:** `rg -n "<Select\b|onValueChange"`

#### Sidebar

**What changed:** the Root ref follows the actual desktop/static/mobile popup; Inset is a native `main`, and list/item parts retain
`ul`/`li` refs. Functional desktop/mobile setters and controlled behavior remain. Polymorphic action/label/button state is wrapper-owned,
not fabricated Menu/Tooltip/Sheet state. `isActive` on SidebarMenuButton and SidebarMenuSubButton now also sets `aria-current="page"` (with
a forced-colors cue, and an underline on sub-buttons). The mobile sheet renders a visible, named close control, last in DOM order and pinned
to the top inline-end corner above a reserved top row; `showCloseButton` (default `true`) controls it and `closeLabel` defaults to
`"Close sidebar"`. In v2.4 that name belonged to the full-screen overlay button; the v3 backdrop is not a named control. SidebarProvider
still writes the `sidebar_state` cookie (`path=/`, `max-age=604800`) on every desktop open-state change, including controlled proposals, and
never reads it; the new `persistState` (default `true`) controls the write. Ctrl+B / Cmd+B toggles the sidebar unless a `keydown` handler
calls `preventDefault()` first (v2.4 toggled regardless). Collapsed-sidebar `tooltip` content opens without delay (`delay={0}` on its own
trigger). `SidebarTriggerProps` is a naming union (see [Button](#button)).

**Before → after:** pass another `aria-current` value for other kinds of current item, or `aria-current={undefined}` on section/disclosure
triggers whose active styling does not mark the current page; seed `defaultOpen` from the cookie, or pass `persistState={false}` when you
persist the state yourself; for another tooltip delay, omit `tooltip` and compose `Tooltip` with
`TooltipTrigger delay={…} render={<SidebarMenuButton …/>}`.

**Why:** the current page is exposed to assistive technology, and the mobile sheet has a real, focusable close control.

**Find usages:** `rg -n "Sidebar(Provider|MenuButton|MenuSubButton|Trigger)|sidebar_state"`

#### Skeleton and Spinner

**What changed:** Skeleton, including the Card/Form/List/Table skeletons, pulses twice (four seconds) and then stays static; v2.4 pulsed
indefinitely. `animated={false}` or reduced motion keeps it static from the start. Neither Skeleton nor Spinner announces loading reliably
(Spinner's `role="status"` and default `"Loading"` name identify it but are not an announcement). Card `lines`, Form `fields`, List `items`
and Table `rows`/`columns` must each be **finite nonnegative integers ≤ 10,000**. No coercion, clamping or truncation occurs. Invalid or
over-limit counts synchronously throw a documented **RangeError before allocation**.

Table additionally requires **`(rows + (showHeader ? 1 : 0)) * columns ≤ 10,000`**, after both axes are validated and before arrays are
allocated. `showHeader` defaults to true. Valid zero dimensions remain valid: zero card lines preserve header/footer; zero form fields
preserve submit; zero list items leave an empty root; zero table axes retain requested empty rows/header unless the header is disabled.
Default counts stay Card 3 / Form 4 / List 5 / Table 5 rows × 4 columns; the List avatar remains enabled by default. All four root refs
remain `HTMLDivElement`. Internal skeletons are decorative and announce nothing.

**Before → after:**

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

Write the loading text into a status region mounted before loading starts (LoadingOverlay's `loadingLabel`, AsyncBoundary's default
fallback, `useAnnounce` or a persistent `VisuallyHidden role="status"`), keep `aria-busy` off that region and mark the spinner
`aria-hidden="true"`.

**Why:** endless motion fails WCAG 2.2.2, and unbounded counts could allocate arbitrarily large arrays.

**Find usages:** `rg -n "Skeleton|<Spinner\b"`

#### Stepper

**What changed:** `completedLabel` controls the assistive text appended to completed steps. Its default remains `"Completed"`. The step
labels and native root `aria-label` remain caller-owned. The active step number uses `--ac-primary-emphasis`.

**Before → after:** pass translated text for the consumer's locale, or an empty string to omit the completion suffix:

```tsx
<Stepper
  steps={["Compte", "Profil", "Vérification"]}
  activeStep={1}
  completedLabel='Terminé'
  aria-label='Progression'
/>
```

**Why:** generated assistive text must follow the page language.

**Find usages:** `rg -n "<Stepper\b"`

#### Table

**What changed:** the scroll viewport (`data-slot="table-container"`, a plain non-focusable `<div>` in v2.4) is a tab stop (`tabIndex={0}`)
with a focus ring and no role or name. The new `containerProps` (attributes and `ref`) configures it.

**Before → after:** name it with `containerProps={{role: "region", "aria-labelledby": captionId}}` (or `aria-label`); pass
`containerProps={{tabIndex: -1}}` only when the table can never overflow.

**Why:** keyboard users must be able to scroll an overflowing table (WCAG 2.1.1).

**Find usages:** `rg -n "<Table\b"`

#### Tabs

**What changed:** default/line visual variants are explicit. Disabled tabs may remain keyboard-focusable under the primitive's
`focusableWhenDisabled` policy, but cannot activate. Panel hiding follows transition completion, not synchronous selected-value inequality.
A forced-colors selected-tab cue is added (see [Accessibility and visual behavior](#accessibility-and-visual-behavior)).

**Before → after:** tests that asserted a panel was hidden synchronously after a selection change must wait for the transition.

**Why:** panels hide when Base UI finishes the exit transition.

**Find usages:** `rg -n "<Tabs\b|TabsPanel|TabsContent"`

#### Toast

**What changed:** in v2.4, the callable/status facade used the names `toast` and `Toaster`. In v3 **`toast` is a real Base UI manager**, not
callable and not a heuristic overload. Mount its ready-made Toaster before emitting. Canonical Provider timeout/limit and manager
timeout/type/actionProps replace facade duration/visibleToasts/status helpers. `Toast` is a component; notification data is
`ToastData`/`ToastObject`.

**Before → after:**

```tsx
// Before — published v2.4 facade:
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

```tsx
// After — canonical v3 manager:
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

**Why:** a real manager exposes Base UI's typed queue, focus and swipe contracts instead of a heuristic facade, and persistent notifications
avoid content disappearing before it is read (WCAG 2.2.1).

**Find usages:** `rg -n "toast(\.(success|error|info|warning|loading|dismiss|custom|getToasts|getHistory))?\(|<Toaster|ToastProvider"`

#### Tooltip and HoverCard

**What changed:** render, state and timing belong to the primitive. `delayDuration` is removed from the root and provider. `TooltipProvider`
is now Base UI's provider (v2.4's was a pass-through that ignored `delayDuration`): its `delay`, `closeDelay` and `timeout` (default 400 ms)
apply to the tooltips inside it, and a tooltip there opens instantly when another closed less than `timeout` earlier, so wrapping an app in
`<TooltipProvider>` changes its tooltip timing. Tooltip's decorative arrow can be disabled with `showArrow={false}` before custom
`TooltipArrow` composition. HoverCardContent offsets default to 4/4 and TooltipContent `sideOffset` to 4.

**Before → after:** `<Tooltip delayDuration={100}>` becomes `<TooltipProvider delay={100}>` or `<TooltipTrigger delay={100}>`; drop it to
keep Base UI's 600 ms default.

**Why:** v2.4 accepted but ignored the alias; the real provider makes timing configurable and groups adjacent tooltips. Preserve hover/focus
visibility and Escape dismissal (WCAG 1.4.13).

**Find usages:** `rg -n "delayDuration|TooltipProvider|TooltipArrow"`

#### Visual effects and motion

BackgroundBeams, BubbleBackground, DotBackground, FireworksBackground, GradientBackground, GradientText, HighlightText, HoleBackground,
TypewriterText, TypewriterTextSmooth, CountingNumber, Scratcher, Flip, Ripple and the other retained extensions.

**What changed:** automatic motion settles to a static frame five seconds after the instance is first scrolled into view (wall clock;
scrolling away and back does not restart it); v2.4 had no time limit. Reduced motion, a hidden document and off-screen instances also pause.
CountingNumber, which has no `loop`, then shows its final value. While paused, FireworksBackground draws a deterministic static starburst.
FireworksBackground's canvas is decorative (background clicks do nothing; v2.4 launched fireworks on click) plus a native launch button
(`launchLabel`, default `"Launch fireworks"`) that stays available after automatic launches settle and in `population={0}` click-only mode;
it is `aria-disabled` (still focusable, activation ignored) under reduced motion, `motionPaused` or a hidden document. Scratcher adds a
native reveal button (`revealLabel`, default `"Reveal content"`) and a visually hidden completion status (`completedLabel`, default
`"Content revealed"`); after the reveal the button keeps focus and its tab stop as `aria-disabled` (activation ignored) until a `width`,
`height` or `gradientColors` change resets the card. Flip accepts `"right"`, not `"righ"`. RippleButton and FlipButton follow
`prefers-reduced-motion`. Canvas refs and error policies retain their owning contracts.

**Before → after:** pass `loop` to keep automatic motion running, together with a caller-supplied, localized native pause/stop control that
sets `motionPaused` (which stops motion at any time); localize the generated labels; replace `direction='righ'` with `direction='right'`.

**Why:** automatic motion that lasts more than five seconds needs a pause mechanism (WCAG 2.2.2), and pointer-only interactions need
keyboard alternatives (WCAG 2.1.1).

**Find usages:** `rg -n "Background|GradientText|HighlightText|Typewriter|CountingNumber|Scratcher|Flip|Ripple"`

### Changed defaults at a glance

These rows compile unchanged but behave differently. Each links to its component section.

| Surface                                    | v2.4                                                     | v3                                                                          | Section                                                           |
| ------------------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Toast auto-dismiss                         | `duration` defaulted to 5000 ms                          | `timeout` defaults to `0`: notifications persist until closed               | [Toast](#toast)                                                   |
| Toast close control name                   | `"Close notification"`                                   | Toaster `closeLabel`, default `"Close toast"`                               | [Toast](#toast)                                                   |
| Automatic visual-effect motion             | No time limit                                            | Settles five seconds after first in view unless `loop`                      | [Visual effects and motion](#visual-effects-and-motion)           |
| Skeleton pulse                             | Indefinite                                               | Two pulses (four seconds), then static                                      | [Skeleton and Spinner](#skeleton-and-spinner)                     |
| ResizableHandle                            | No step buttons                                          | Native −/+ step buttons: two extra tab stops per handle                     | [Resizable](#resizable)                                           |
| FireworksBackground                        | Clicking the canvas launched fireworks                   | Decorative canvas plus a native launch button                               | [Visual effects and motion](#visual-effects-and-motion)           |
| Scratcher                                  | Pointer scratching only                                  | Native reveal button and completion status                                  | [Visual effects and motion](#visual-effects-and-motion)           |
| PaginationPrevious / PaginationNext name   | `"Go to previous page"` / `"Go to next page"`            | The visible `text`: `"Previous"` / `"Next"`                                 | [Pagination](#pagination)                                         |
| SidebarMenuButton tooltips                 | Base UI's 600 ms delay                                   | Collapsed-sidebar tooltips open without delay                               | [Sidebar](#sidebar)                                               |
| TooltipProvider                            | Pass-through                                             | Real provider: `delay`, `closeDelay`, `timeout` (400 ms) grouping           | [Tooltip and HoverCard](#tooltip-and-hovercard)                   |
| Carousel transitions                       | Embla's `duration` regardless of the motion preference   | Instant while `prefers-reduced-motion: reduce` matches                      | [Carousel](#carousel)                                             |
| Table scroll viewport                      | Plain, non-focusable `<div>`                             | A tab stop with a focus ring                                                | [Table](#table)                                                   |
| Dialog/Sheet content close                 | Hidden unless requested                                  | `showCloseButton` defaults to `true`                                        | [Dialog and Sheet](#dialog-and-sheet)                             |
| Dialog/Sheet backdrop                      | Rendered for every modality                              | Rendered only for `modal={true}`                                            | [Dialog and Sheet](#dialog-and-sheet)                             |
| AlertDialogAction                          | Closed the dialog                                        | Does not close                                                              | [AlertDialog](#alertdialog)                                       |
| ContextMenuContent placement               | Base UI default (`bottom`, offsets −5/2)                 | `inline-end`, offsets 0/4                                                   | [Menus](#menus)                                                   |
| ComboboxContent placement                  | Base UI default (`center`, 0)                            | `align="start"`, `sideOffset={6}`                                           | [Combobox](#combobox)                                             |
| ScrollBar                                  | Mounted on overflow                                      | `keepMounted` defaults to `true`; stable 1.5rem gutter                      | [ScrollArea](#scrollarea)                                         |
| Badge element                              | `div`                                                    | `span`                                                                      | [Badge](#badge)                                                   |
| Sidebar mobile close                       | Named full-screen overlay button                         | Visible close control, `closeLabel` default `"Close sidebar"`               | [Sidebar](#sidebar)                                               |
| Sidebar Ctrl+B / Cmd+B                     | Toggled regardless                                       | Yields to a `keydown` handler that calls `preventDefault()`                 | [Sidebar](#sidebar)                                               |
| `useFocusManager` candidates               | Skipped only `disabled` and negative-`tabindex` elements | Also skips `aria-disabled`, hidden, `inert` and closed/disabled content     | [FocusScope and useFocusManager](#focusscope-and-usefocusmanager) |
| Menu, Sidebar and DropDrawer `dir`         | No `dir` written                                         | `dir="rtl"` under an RTL `DirectionProvider`                                | [Menus](#menus)                                                   |
| Calendar without `locale`                  | Runtime locale                                           | DayPicker's `en-US` default                                                 | [Calendar](#calendar)                                             |
| Checkbox / Switch / RadioGroupItem element | `<button>`                                               | `<span>` plus hidden `<input>`; drop bare `nativeButton`                    | [Checkbox](#checkbox)                                             |
| CardContent as first child                 | No top padding                                           | Top padding `--ac-card-spacing`                                             | [Card](#card)                                                     |
| Progress `className`                       | Styled the Track                                         | Styles the Root                                                             | [Progress and Slider](#progress-and-slider)                       |
| `convertHslToHexString` out-of-range input | Malformed output                                         | Hue wraps, saturation/lightness clamp, non-finite input throws `RangeError` | [Color utilities](#color-utilities)                               |

### Repository website adoption checklist

The repository website (`sites/arolariu.ro`) pins the published 2.4 tarball. When it adopts a published v3 release:

1. Update the website's official tarball/integrity through its separately authorized dependency adoption, never a local workspace alias.
2. Migrate facade-dependent status/promise/custom calls to canonical manager/compound APIs.
3. Commander must compose the canonical shell with exactly one explicit Command; keep localized title/description, stable action values,
   separate selected/search state and app-owned shortcuts.
4. Async AlertDialog callers must own success-close/rejection/pending policies.
5. Recheck native refs, form/value/callback contracts and affected application tests against the published package.
6. Decide each row of [Changed defaults at a glance](#changed-defaults-at-a-glance) explicitly. The site's `providers.tsx` renders
   `<Toaster />` without props, which in v3 makes every notification persistent: pass `timeout` where v2.4's 5000 ms auto-dismissal is still
   intended (with enough reading time and a way to dismiss) and a localized `closeLabel`. Choose between settled motion and `loop` plus a
   localized pause control for the decorative effects the site renders (BackgroundBeams, DotBackground, GradientText, TypewriterTextSmooth),
   and expect two-pulse skeletons in route `loading.tsx` files. CountingNumber (the platform statistics use `inView`) has no `loop` opt-in:
   it counts up once when first scrolled into view and shows its final value from five seconds after that, so re-entering view does not
   replay it.
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

### Retained extensions and unselected families

CSS Modules and `--ac-*` tokens remain; no Tailwind/CVA/external cn/runtime CSS-in-JS migration. Primitive-generated geometry/animation
styles and narrowly approved data-driven bridges (e.g. chart series color/aspect ratio) are not a general styling exception. Recharts
non-deprecated primitives/hooks/constants, RHF pass-throughs, existing calendar/OTP regex and imperative-panel types remain.
Background/text/canvas extensions and Copy/Counting/Flip/Ripple/Stepper/Timeline/Typewriter/VisuallyHidden remain.

Optional headless-UI, Sonner and cmdk engine families are not included: there are no root exports for them and no eager imports of absent
engines. Native Command and canonical components are not renamed substitutes for those engines. Private underscore modules may ship
transitively but are not supported imports.

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
- the public JSDoc contract (`src/jsdoc-contracts.test.ts`): every public export has a summary, components have examples, functions document
  parameters and return values, package-declared props are documented, `@default` tags match the implementation and every `{@link}`
  resolves;
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
