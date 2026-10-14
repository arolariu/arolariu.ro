# Migration Guide

## v2.4 to v3

**3.0.0 is release preparation, not a published release.** The changes below describe the approved upcoming major. Do not install an
unavailable version, point a consumer at local source/dist, or change application runtime calls before adopting an actually published
artifact. The repository website must retain its official published **2.4.0 tarball** and existing calls during this preparation.

The historical v0.x → v1.0 guide follows this section unchanged. Its old dependency ranges and examples are historical, not instructions for
adopting v3.

### Dependency and packaging decision

- Upcoming Base UI peer minimum: **`@base-ui/react@^1.9`**. Public 1.0's export map lacks `./drawer`; the actually tested 1.9 provides it
  and declares React `^17 || ^18 || ^19`. This is a verified minimum chosen for this major, **not a claim that 1.9 is the earliest possible
  supporting version**. Consumers using older Base UI must upgrade.
- React and ReactDOM remain **`^18.2 || ^19`**. All other runtime package names/ranges stay unchanged, including Motion 13/14, RHF 7 and
  Recharts 3.8-compatible peers. No Sonner, Headless UI or cmdk dependency is added.
- ESM, declarations, original source, CSS Modules, `styles`/`styles.css`, CSS side effects and client/server boundaries remain supported.
  MIGRATION is included in the package file list. Short public subpaths are explicit; underscore helpers are private even when emitted or
  packed as transitive modules.
- An isolated React/ReactDOM 18.2 source lane verified 18 fixtures independently of the React 19 source-root lane. All **18 fixtures also
  pass against the actual npm-packed/extracted ESM artifact**, with isolated native-runtime/identity guards and zero source proxies. This is
  focused compatibility evidence, not a universal render/composition guarantee.
- The actual component build, generated ESM/declarations/CSS/client directives, three extracted npm artifact contracts and Storybook
  documentation build are verified. The parent's final post-wave component workspace coverage, scoped review, configured ESLint and
  383-changed-file Prettier checks passed, as recorded below. The known source hook/story strict baseline, physical-browser risk acceptance,
  publication and website adoption remain distinct limits or gates. No React 18 packed result is inferred from React 19.

### Public names and collision rules

Use explicit root or family imports; public named props/state types accompany existing component namespaces where those namespaces are
defined by the family. Generic primitive roots retain their primitive generics and event-detail namespace members.

| Purpose                                | v3 root name                                         | Deliberate distinction                                                                          |
| -------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Styled field error component           | `FieldError`                                         | RHF's data type is `RHFFieldError` at the root; `/form` retains its original `FieldError` type. |
| Native label                           | `Label`                                              | Recharts' label is `RechartsLabel`, preserving all 59 chart aliases plus chart helpers.         |
| Canonical toast root                   | `Toast`                                              | Notification data is `ToastData<T>` / `ToastObject<T>`, not a type alias called `Toast`.        |
| Ready-made canonical toast composition | `Toaster`                                            | The facade is `LegacyToaster`; no `SonnerToaster` is included.                                  |
| Direction context                      | `DirectionProvider`, `useDirection`, `TextDirection` | Exact Base UI provider/hook identity; no second provider or conflicting `Direction` alias.      |

RHF's provider, Controller, six hook pass-throughs and existing named RHF types are retained. `Form` is still `FormProvider`, **not a native
`<form>`**. Public additions include full Combobox/Progress/ScrollArea parts, Avatar badge/group/count, CalendarDayButton,
NavigationMenuPositioner, DrawerSwipeHandle, Popover naming parts, TooltipArrow, NativeSelect and the additive Attachment/Bubble/Marker/
Message display families. These display families do not introduce AI/chat SDK, upload, network, application store or localization policy.

### Toast: manager versus explicit legacy facade

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

**After — explicit compatibility when the facade is still required:**

```tsx
"use client";
import {legacyToast as toast, LegacyToaster as Toaster} from "@arolariu/components/legacy-toast";

// Mount the legacy viewport before calling the singleton facade.
<Toaster
  duration={5000}
  visibleToasts={3}
/>;
// Inside an event handler, after the LegacyToaster has mounted:
const id = toast.success("Saved", {duration: 3000});
toast.update(id, {message: "Saved again"});
toast.dismiss(id);
toast.custom((toastId) => <div data-toast-id={toastId}>Custom notification</div>);
```

Root imports of the explicit legacy names are also supported. Do not alias the facade back into the package's canonical names. Legacy
history/callback snapshots use `LegacyToastSnapshot`; replacing an old snapshot type with `ToastData` is not automatically structurally
compatible.

Independent canonical scopes use `createToastManager<Data>()` with `toastManager={manager}` on Toaster or ToastProvider.
`useToastManager<Data>()` reads only its nearest provider. A plain ToastProvider does **not** implicitly attach the global manager. Toaster
`viewportProps` configures the viewport, not custom notification-list children; compose ToastProvider/Portal/Viewport and the Toast parts
for a custom list. Ready-made top placements swipe up/right; bottom placements swipe down/right. Compound roots retain primitive
swipe-direction options and all primitive-owned render states.

Canonical `onClose`/`onRemove` have zero-argument primitive signatures. Legacy `onDismiss(snapshot)` runs on every close, including timeout;
`onRemove(snapshot)` runs after every removal. Deprecated `onAutoClose` aliases **onRemove**, not timeout-only behavior, and onRemove wins
if both are supplied. No removal cause is fabricated.

Legacy inactive/unknown updates now throw rather than inventing active/history records. Invalid duration, ID, variant, action descriptor,
options, promise source and custom renderer inputs fail explicitly. Promise rejections, formatter failures and finally failures remain
rejected: await/catch them in application code. Dismissed or replaced IDs cannot be resurrected by late settlement. Default-prop updates do
not clear active records; unmount does. Factories render inside React rather than being invoked during imperative calls; immutable factory
snapshots contain React nodes/elements rather than eagerly produced text.

### Command: one explicit native root

Canonical CommandDialog is now **only the modal shell**. Supply exactly one explicit Command root. The separately named LegacyCommandDialog
supplies the old automatic root and accepts direct input/list children; **never put a Command inside that adapter**.

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

**After — explicit automatic-root compatibility:**

```tsx
import {LegacyCommandDialog} from "@arolariu/components/legacy-command-dialog";
import {CommandInput, CommandItem, CommandList} from "@arolariu/components/command";

<LegacyCommandDialog
  open={open}
  onOpenChange={setOpen}
  title='Actions'
  description='Choose an action'>
  <CommandInput placeholder='Search actions' />
  <CommandList>
    <CommandItem
      value='copy'
      onSelect={copy}>
      Copy
    </CommandItem>
  </CommandList>
</LegacyCommandDialog>;
```

Command remains native, **not cmdk**: default matching is case-insensitive substring, not fuzzy ranking; custom filters return finite
positive scores. Root selected `value` is distinct from Input search `value`. Controlled values are authoritative, including temporarily
unmatched values; automatic uncontrolled fallback does not emit user-selection callbacks. Give items stable unique explicit values and IDs,
independent of translated text/shortcut content. Inferred values include trimmed shortcut text.

Keep registered items/groups directly under their List/Group for score/DOM ordering. Arbitrary cross-wrapper nested score layout, cmdk
hooks/Loading/store/measurement variables and a generic cmdk/asChild API are not supplied. Native option focusability remains; separators
hide during search unless `alwaysRender`. Empty is a polite local status counting visible disabled/force-mounted options but not externally
hidden ones. Native consumer event cancellation is preserved. Local centered geometry and the default "Command menu" title are retained, not
claimed to reproduce upstream pixels.

### Breaking defaults, values, refs and native tags

| Family                           | Migration / retained boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button and composed controls     | Non-button canonical targets must specify `nativeButton={false}`. Refs truthfully target `HTMLElement` where composition permits non-button elements; native button refs remain usable. Button adds `xs`, `icon-xs`, `icon-sm`, `icon-lg`; exhaustive consumer size maps must include them.                                                                                                                                                                                                                                                                                                                                                         |
| Badge                            | Default element/ref becomes `span` / `HTMLSpanElement`, not div. Use `render={<div />}` deliberately for block markup; composed refs follow the real element. Ghost/link variants are additive.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Breadcrumb/Item                  | Composed refs target `HTMLElement`; native parts retain exact tags/refs. Item's default div remains inert, `xs` is additive and rich descriptions/clamping are deliberate. Breadcrumb root `separator` is a deprecated no-op; use BreadcrumbSeparator.                                                                                                                                                                                                                                                                                                                                                                                              |
| Primitive render/class callbacks | Wrappers no longer evaluate these through a stateless outer renderer. Callback props/state belong to the actual primitive and callback refs are merged callbacks, not assumed mutable ref objects. Preserve forwarded props/ref and use actual state, event details and cancellation.                                                                                                                                                                                                                                                                                                                                                               |
| Accordion                        | Without legacy `type`, values/callbacks are **arrays**. `type="single"` preserves scalar `string \| undefined`; `type="multiple"` is an array alias. Do not combine legacy `type` with canonical `multiple`. Canonical `[""]` selects an empty-string item and `[]` means none; legacy `""` means none. `collapsible={false}` cancels empty proposals using the original event details.                                                                                                                                                                                                                                                             |
| Collapsible                      | Open callbacks keep primitive event details; `details.trigger` is not synthesized when absent. Trigger render children are retained.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Slider                           | Scalar stays scalar; readonly/mutable ranges retain primitive inference and one thumb per supplied endpoint, including zero for an empty range. An omitted default is the primitive's single minimum, not an invented range. Keep `(value, details)` change/commit callbacks and native named inputs.                                                                                                                                                                                                                                                                                                                                               |
| Progress                         | Omitted/null values are primitive indeterminate state, not coerced to zero. Root children are retained. Four explicit parts replace the convenience track when a direct local/Base UI track is supplied; Value formatting belongs to the primitive.                                                                                                                                                                                                                                                                                                                                                                                                 |
| Tabs                             | Default/line visual variants are explicit. Disabled tabs may remain keyboard-focusable under the primitive's `focusableWhenDisabled` policy, but cannot activate. Panel hiding follows transition completion, not synchronous selected-value inequality.                                                                                                                                                                                                                                                                                                                                                                                            |
| Select                           | Root retains generic object/number/multiple values and nullable single selection. Do not filter callbacks into old string-only values; retain original `(value, details)`, equality, cancellation and clear semantics. To name the listbox use `listProps`, not only Popup's label.                                                                                                                                                                                                                                                                                                                                                                 |
| Combobox                         | No automatic search/List/Empty block, transient item-label registry or empty-string deselection. Move root placeholder/searchPlaceholder/emptyMessage/className to explicit Value/Input/Empty/visual parts; supply persistent Root `items`, an explicit ComboboxList, ComboboxLabel instead of group heading and root filter/data instead of item keywords. Single clearing yields null; multiple yields arrays. No legacy-combobox engine is added.                                                                                                                                                                                                |
| Dialog/Sheet                     | Content icon close defaults **true** (`showCloseButton={false}` opts out). DialogFooter's optional close defaults false. Exported Close parts no longer impose icon positioning; Sheet's automatic close follows content in DOM order. Invalid text/fragment legacy slots throw rather than falling back.                                                                                                                                                                                                                                                                                                                                           |
| AlertDialog                      | Canonical Action is an ordinary Button and **does not close**. Explicitly close after successful async work; surface failures and decide pending-dismissal cancellation. Cancel remains Close-backed. `LegacyAlertDialogAction` immediately closes without awaiting handlers and is only for deliberate synchronous compatibility. Base UI 1.9 allows Escape dismissal but prevents outside/backdrop dismissal; cancel Escape via original details when application policy requires it.                                                                                                                                                             |
| Popover                          | PopoverAnchor remains a structural container, **not a registered positioning anchor**; supply Content `anchor` with a measurable element/ref. Header is layout; Title/Description perform actual accessible registration.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Tooltip/HoverCard                | Render/state/timing belongs to the primitive. Trigger delay beats legacy root delay, which beats provider delay; native delay overrides legacy provider delayDuration. Tooltip's default decorative Arrow can be disabled with `showArrow={false}` before custom TooltipArrow composition.                                                                                                                                                                                                                                                                                                                                                          |
| Menus                            | Popup render/class/ref/focus remain on Popup, positioning options on Positioner, portal options on Portal. Trigger refs may be HTMLElement. Primitive checked/value/nativeButton/event details are not converted; submenu `inline-end` is RTL-aware. See family props for deliberate offset defaults.                                                                                                                                                                                                                                                                                                                                               |
| Drawer                           | Actual Viewport owns gestures/snaps/nesting. Modal true alone has a blocking backdrop; nonmodal/trap-focus viewports do not. Default down/modal behavior remains; `showSwipeHandle` defaults false, and decorative DrawerSwipeHandle stays outside Content. No snap point/list is invented.                                                                                                                                                                                                                                                                                                                                                         |
| NavigationMenu                   | Root supplies automatic positioned Popup/Viewport. Use `positionerProps={false}` for explicit NavigationMenuPositioner/legacy Viewport composition; don't nest another automatic viewport. Deprecated Viewport and standalone decorative Indicator remain available.                                                                                                                                                                                                                                                                                                                                                                                |
| Sidebar                          | Root ref follows actual desktop/static/mobile popup; Inset is native main, list/item parts retain ul/li refs. Functional desktop/mobile setters and controlled behavior remain. Polymorphic action/label/button state is wrapper-owned, not fabricated Menu/Tooltip/Sheet state.                                                                                                                                                                                                                                                                                                                                                                    |
| Calendar                         | DayPicker discriminated selection modes and primitive callbacks remain. Styled classNames append, except animation keys are a **single replaced token**, not a merged class list; provide CSS for overridden tokens. Custom components replace defaults, Custom Root must attach merged rootRef, and locale-aware CalendarDayButton preserves native button refs.                                                                                                                                                                                                                                                                                   |
| Carousel/Resizable               | Keep Embla options/plugins/API and real `useCarousel` context. Navigation refs follow Button's HTMLElement contract. Resizable remains installed v4 Group/Panel/Separator with primitive imperative handles/callbacks; use percentage-string constraints and primitive orientation state, not old ad hoc selectors.                                                                                                                                                                                                                                                                                                                                 |
| Chart                            | ChartContainer id/class/ref now belong to the native **outer root**, not ResponsiveContainer's optional measuring div. Native id/className are strings. Use JSX content or callbacks returning JSX for ref-capable Tooltip/Legend content, not direct function invocation. Generated data-chart scopes are internal unique IDs; use native id/class/data-slot instead. Unsafe config color declarations are omitted; nullish formatter output suppresses rows and default ranges use `~`.                                                                                                                                                           |
| Form/Field                       | Form remains RHF's provider. FormControl preserves real element/event refs and child-first cancellation; no implicit replacement of the RHF update handler. Only mounted meaningful description/message nodes get ARIA references; blank/boolean/empty-fragment errors don't create empty messages, but numeric zero remains meaningful. Invalid fields can remain invalid without text. Inline messages are not automatic alerts: own one submission announcement.                                                                                                                                                                                 |
| Input/OTP/Textarea/Label         | Input state/callbacks remain Base UI-owned. OTP invalid indexes fail fast; active caret suppresses placeholder, inactive empty slots retain placeholder or `·`. Textarea and Label remain native/server-compatible; Textarea defaults to manual resizing, with `data-sizing="content"` as CSS progressive enhancement, not a fabricated Base Textarea/autoresize API.                                                                                                                                                                                                                                                                               |
| Native/display parts             | AlertTitle remains h5; EmptyDescription remains paragraph by default with discriminated `as="div"` for block content. Kbd/group remain native kbd; Table remains a real table with its horizontal wrapper. Skeleton/Spinner can use `animated={false}` and reduced motion. ScrollArea convenience composition stays; explicit Root/Viewport/Content/Thumb/Corner parts support sibling axis scrollbars and actual viewport refs.                                                                                                                                                                                                                    |
| Boundaries/loading               | Explicit `fallback={null}` stays empty. ErrorBoundary normalizes unknown thrown values to Error with cause, preserving genuine Error identity. Reset requires repaired descendants/replaced rejected resource. AsyncBoundary owns no fetch/cache/DOM ref. FocusScope is local keyboard scope, not a modal engine. LoadingOverlay is visual/non-intercepting; the caller owns inert/disabled/busy/focus, with status outside busy and inert subtrees.                                                                                                                                                                                                |
| DropDrawer                       | Open state survives breakpoint changes; submenu path resets and the new primitive owns focus. Mobile actions are native buttons; desktop uses Menu. `closeOnClick` defaults true, including submenu actions. Live registrations are not cached React children. Desktop maps trap-focus to Menu modal mode; mobile follows Drawer backdrop rules. Shared states are engine unions: narrow them rather than assuming Menu highlighting on mobile.                                                                                                                                                                                                     |
| Local visual/motion extensions   | All nine background/text/canvas extensions and Copy/Counting/Flip/Ripple/Stepper/Timeline/Typewriter/VisuallyHidden remain. HoleBackground ref targets canvas while className styles its div shell. Scratcher adds native keyboard reveal and validates dimensions/percentage. Copy failure has error state and `onCopyError(unknown)`; preserve caller-localized labels. Flip `right` is canonical; deprecated `righ` remains accepted. Extension buttons remain native/non-submitting by default; no new render/asChild engine. Typewriter exposes one immediate readable phrase with decorative motion copies/cursors and static reduced motion. |

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
Internal skeletons are decorative; the caller supplies one labeled loading/busy region.

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

### Retained extensions, no-ops and unselected families

CSS Modules and `--ac-*` tokens remain; no Tailwind/CVA/external cn/runtime CSS-in-JS migration. Primitive-generated geometry/animation
styles and narrowly approved data-driven bridges (e.g. chart series color/aspect ratio) are not a general styling exception. Recharts
primitives/hooks/constants, deprecated Cell, RHF pass-throughs, existing calendar/OTP regex and imperative-panel types remain. Chart config
`stackId` is consumer metadata, not automatic series configuration; outer Recharts positioning/sorting/container props remain outer
responsibilities. Legend align/layout/iconSize/iconType/inactiveColor do not restyle the owned content markup; arbitrary content-helper
children remain unused. `hideIndicator` keeps configured tooltip icons, and `hideIcon` replaces legend icons with swatches. Existing
Breadcrumb root separator and decorative compatibility flags are consumed deliberately, not leaked to native DOM.

T34/T35/T36 are unselected/gated: no optional headless or Sonner root exports and no eager imports of absent engines. Native Command and
explicit legacy adapters are not renamed substitutes for those engines. Private underscore modules may ship transitively but are not
supported imports.

### Website adoption is a later published-artifact task

Do **not** apply these edits in the current library preparation. Once an approved v3 artifact is actually published:

1. Update the website's official tarball/integrity through its separately authorized dependency adoption, never a local workspace alias.
2. For facade-dependent status/promise/custom calls, locally alias `legacyToast as toast` and `LegacyToaster as Toaster` together. Preserve
   the current published 2.4 runtime behavior until then.
3. Commander must choose canonical shell + exactly one explicit Command or LegacyCommandDialog + no nested Command; keep localized
   title/description, stable action values, separate selected/search state and app-owned shortcuts.
4. Async AlertDialog callers must own success-close/rejection/pending policies, not switch blindly to the immediate legacy action.
5. Recheck native refs, form/value/callback contracts and affected application tests against the published package.

Verified follow-up candidates include Commander; InvoicePreferences; DeleteScanDialog/ShareInvoiceDialog; edit-invoice SharingCard,
ItemsTable/EditInvoiceContext and AddRecipe/AddScan/Allergen/DeleteRecipe/Feedback/RemoveScan/UpdateRecipe dialogs; CreateInvoiceContext;
ScanUploadContext and its test/types/uploadSession; ShareCollaborateCard; invoice/bulk Export dialogs and BulkActionsToolbar;
ScanSelectionToolbar/CreateInvoiceDialog/useScans; useInvoiceDelete/useInvoiceShare/useScanAdd/useScanDelete/useScanRename/useScanRotation;
detachScanFromInvoice/createScan. These are adoption inventory, not authorization to edit routes, auth, Next configuration or domain logic.

### Evidence and limits

Focused Vitest contracts use real modules/primitives; no producer replacement mocks or alternate automated runner. Strong TypeScript
source/test/story checks do not prove packed ESM/declaration/style availability; the upcoming major has separately passed its actual build,
three extracted artifact contracts and 18 React 18 packed fixtures. Release gates retain 80% branch / 95% function, line and statement
thresholds; focused coverage-disabled runs make no aggregate coverage claim.

The parent ran the final post-wave component workspace coverage checkpoint on **2026-10-14**, with `AROLARIU_COMPONENTS_PACKED_ROOT` set to
the genuine extracted npm artifact:

```bash
npm run test:unit --workspace=@arolariu/components -- --maxWorkers=2 --reporter=dot
```

**Exit 0: 126 files / 3,043 tests / no skips**, including three actual packed contracts. Start **10:50:17 local**, duration **333.64
seconds**. Statements **98.35% (3769/3832)**, branches **95.32% (2997/3144)**, functions **99.41% (1025/1031)**, lines **99.25%
(3573/3600)**. The existing thresholds/exclusions were unchanged. Expected Motion reduced notices/npm configuration warnings stayed visible;
no React Tabs act warnings after the fixture-only corrections.

Final scoped review (`a3e8b0b6`) found I1/I2 and M1–M10 all addressed, zero remaining and zero new Important regressions. Parent-reported
configured ESLint and Prettier for all **383 changed files** passed; real React18 source and actual packed lanes each passed **18
fixtures**. This is **not an all-monorepo validation claim**. The known 15 baseline hook/story strong-type diagnostics and website
fixture/build-environment blocks remain separate.

Physical painting, native browser focus/inert, pointer/touch gestures, animation, clipboard permissions, scrolling/anchoring and
screen-reader speech need separately accepted review evidence. Happy DOM geometry fixtures and parsed CSS are not physical-engine proof.
Packaging/release approval, publishing and website adoption remain distinct decisions.

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
