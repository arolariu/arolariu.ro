"use client";

import {ContextMenu as BaseContextMenu} from "@base-ui/react/context-menu";
import {useDirection} from "@base-ui/react/direction-provider";
import type {ComponentRenderFn, HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSubTrigger,
} from "./dropdown-menu";
import styles from "./context-menu.module.css";

/** Primitive context-menu state options. */
export type ContextMenuProps = Readonly<BaseContextMenu.Root.Props>;
/** Accessible group props from the actual ContextMenu alias. */
export type ContextMenuGroupProps = Readonly<React.ComponentPropsWithRef<typeof BaseContextMenu.Group>>;
/** Portal props from the actual ContextMenu alias. */
export type ContextMenuPortalProps = Readonly<React.ComponentPropsWithRef<typeof BaseContextMenu.Portal>>;
/** Native radio-group values and event details from the actual ContextMenu alias. */
export type ContextMenuRadioGroupProps = Readonly<React.ComponentPropsWithRef<typeof BaseContextMenu.RadioGroup>>;
/** Native ContextMenu submenu-root props. */
export type ContextMenuSubProps = Readonly<BaseContextMenu.SubmenuRoot.Props>;
/** Primitive trigger props and render composition. */
export type ContextMenuTriggerProps = Readonly<React.ComponentPropsWithRef<typeof BaseContextMenu.Trigger>>;
type ContextMenuPositioningProps = Omit<
  BaseContextMenu.Positioner.Props,
  keyof BaseContextMenu.Popup.Props | "positionMethod" | "alignOffset" | "side" | "sideOffset"
> & {
  /** Offset in pixels along the alignment axis, or a function of the anchor and popup sizes. @default 4 */
  alignOffset?: BaseContextMenu.Positioner.Props["alignOffset"];
  /** Side of the anchor (the pointer, or a submenu trigger) to open on; collision handling may flip it. @default "inline-end" */
  side?: BaseContextMenu.Positioner.Props["side"];
  /** Distance in pixels between the anchor and the popup, or a function of their sizes. @default 0 */
  sideOffset?: BaseContextMenu.Positioner.Props["sideOffset"];
};
type MenuDataAttributes = {readonly [key: `data-${string}`]: string | number | boolean | undefined};
/** Popup DOM/state props and separate primitive-derived placement options. */
export type ContextMenuContentProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseContextMenu.Popup>
    & ContextMenuPositioningProps & {
      /** Positioner DOM, ref, render and state-class props; placement stays at the top level. */
      positionerProps?: Readonly<
        Omit<
          React.ComponentPropsWithRef<typeof BaseContextMenu.Positioner>,
          keyof ContextMenuPositioningProps | "children" | "positionMethod"
        >
          & MenuDataAttributes
      >;
      /** Portal options. Nested modal menus should target the enclosing primitive Portal, not an external sibling. */
      portalProps?: Readonly<Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.Portal>, "children"> & MenuDataAttributes>;
    }
>;
/** ContextMenu.Item is the same installed primitive as Menu.Item. */
export type ContextMenuItemProps = DropdownMenuItem.Props;
/** Native checkbox props with optional inset. */
export type ContextMenuCheckboxItemProps = DropdownMenuCheckboxItem.Props;
/** Native radio props with optional inset. */
export type ContextMenuRadioItemProps = DropdownMenuRadioItem.Props;
/** Primitive submenu trigger props with optional inset. */
export type ContextMenuSubTriggerProps = DropdownMenuSubTrigger.Props;
/** Primitive group-label props with optional inset. */
export type ContextMenuLabelProps = DropdownMenuLabel.Props;
/** Primitive separator props. */
export type ContextMenuSeparatorProps = DropdownMenuSeparator.Props;
/** Presentation-only shortcut props. */
export type ContextMenuShortcutProps = DropdownMenuShortcut.Props;

function withContextChildren<State>(
  render: React.ReactElement | ComponentRenderFn<HTMLProps, State> | undefined,
  children: React.ReactNode,
): React.ReactElement | ComponentRenderFn<HTMLProps, State> | undefined {
  if (render === undefined || typeof render === "function" || children === undefined) return render;
  return function renderContextElement(elementProps): React.ReactElement {
    return (
      <ContextElement
        render={render}
        elementProps={elementProps}>
        {children}
      </ContextElement>
    );
  };
}

function ContextElement({
  render,
  elementProps,
  children,
}: Readonly<{render: React.ReactElement; elementProps: HTMLProps; children: React.ReactNode}>): React.ReactElement {
  // eslint-disable-next-line react-x/no-children-to-array -- Resolve Flight-lazy elements through React's public children boundary.
  const [element] = React.Children.toArray(render);
  // eslint-disable-next-line react-x/no-clone-element -- Replace only compound children; ContextMenu owns state, ref and event merging.
  const decorated = React.isValidElement<{children?: React.ReactNode}>(element) ? React.cloneElement(element, {children}) : render;
  return useRender({render: decorated, props: {...elementProps}});
}

/**
 * Coordinates the real pointer/long-press context menu without adding a DOM wrapper.
 *
 * @remarks
 * - Client-only (`"use client"`): compose a `ContextMenuTrigger` region and a `ContextMenuContent` inside it.
 * - Base UI opens the menu from a `contextmenu` event (a right click, or the context-menu key or Shift+F10 where the
 *   browser dispatches one to the focused element) and from a long press, anchored at the pointer.
 * - Keyboard obligation (WCAG 2.1.1): the default trigger is a non-focusable `<div>`, so a pointer-only trigger hides
 *   its actions from keyboard users. Render the trigger as a focusable, named control so the context-menu key or
 *   Shift+F10 can open it, and duplicate every essential action in keyboard-reachable controls (for example a
 *   "More actions" `DropdownMenu`), because not every keyboard or platform offers a context-menu key.
 *
 * @example
 * ```tsx
 * <ContextMenu>
 *   <ContextMenuTrigger render={<button type='button' onClick={openReport} />}>Quarterly report.pdf</ContextMenuTrigger>
 *   <ContextMenuContent aria-label='Quarterly report actions'>
 *     <ContextMenuItem onClick={rename}>Rename</ContextMenuItem>
 *     <ContextMenuItem variant='destructive' onClick={moveToTrash}>Move to trash</ContextMenuItem>
 *   </ContextMenuContent>
 * </ContextMenu>
 * ```
 */
function ContextMenu(props: Readonly<ContextMenu.Props>): React.ReactElement {
  return <BaseContextMenu.Root {...props} />;
}
/**
 * Groups related context-menu items with the primitive's `role="group"` semantics.
 *
 * @remarks
 * - Client-only; render inside `ContextMenuContent` or `ContextMenuSubContent` and name it with a `ContextMenuLabel`
 *   child, which Base UI wires up through `aria-labelledby`.
 *
 * @example
 * ```tsx
 * <ContextMenuGroup>
 *   <ContextMenuLabel>Clipboard</ContextMenuLabel>
 *   <ContextMenuItem onClick={copy}>Copy</ContextMenuItem>
 * </ContextMenuGroup>
 * ```
 */
const ContextMenuGroup = BaseContextMenu.Group;
/**
 * Hosts content in the primitive portal.
 *
 * @remarks
 * - Client-only. `ContextMenuContent` already renders this Portal; configure it there with `portalProps` and use this
 *   part only when composing raw Base UI `ContextMenu.Positioner`/`ContextMenu.Popup` parts.
 *
 * @example
 * ```tsx
 * <ContextMenuPortal container={shadowRoot}>
 *   <ContextMenu.Positioner>
 *     <ContextMenu.Popup aria-label='Canvas actions'>…</ContextMenu.Popup>
 *   </ContextMenu.Positioner>
 * </ContextMenuPortal>
 * ```
 */
const ContextMenuPortal = BaseContextMenu.Portal;
/**
 * Owns a single-choice value for its `ContextMenuRadioItem` children.
 *
 * @remarks
 * - Client-only; renders a `role="group"` named by a `ContextMenuLabel` child. Values (including `null`) and the
 *   cancellable `onValueChange` details are Base UI's, unadapted.
 *
 * @example
 * ```tsx
 * <ContextMenuRadioGroup value={view} onValueChange={setView}>
 *   <ContextMenuLabel>View</ContextMenuLabel>
 *   <ContextMenuRadioItem value='grid'>Grid</ContextMenuRadioItem>
 *   <ContextMenuRadioItem value='list'>List</ContextMenuRadioItem>
 * </ContextMenuRadioGroup>
 * ```
 */
const ContextMenuRadioGroup = BaseContextMenu.RadioGroup;
/**
 * Coordinates a nested context menu, its keyboard behavior and Escape handling, without a DOM wrapper.
 *
 * @remarks
 * - Client-only; wrap one `ContextMenuSubTrigger` and one `ContextMenuSubContent`. The trigger opens it on hover,
 *   click, Enter, Space or the inline-end arrow key; Escape closes only the submenu unless `closeParentOnEsc` is set.
 *
 * @example
 * ```tsx
 * <ContextMenuSub>
 *   <ContextMenuSubTrigger>Share</ContextMenuSubTrigger>
 *   <ContextMenuSubContent aria-label='Share options'>
 *     <ContextMenuItem onClick={emailLink}>Email link</ContextMenuItem>
 *   </ContextMenuSubContent>
 * </ContextMenuSub>
 * ```
 */
const ContextMenuSub = BaseContextMenu.SubmenuRoot;

/**
 * Marks the region that opens the context menu; render callbacks run only inside the primitive.
 *
 * @remarks
 * - Client-only; render inside `ContextMenu`. Renders a `<div>` that opens the menu on right click or a 500 ms long
 *   press and suppresses the browser's own context menu over the region.
 * - The default `<div>` is not focusable. Give keyboard users a path: render a focusable, named element (for example
 *   `render={<button type='button' />}`), on which the context-menu key or Shift+F10 dispatches `contextmenu`, and
 *   duplicate essential actions in keyboard-reachable controls.
 *
 * @example
 * ```tsx
 * <ContextMenuTrigger render={<button type='button' onClick={openReport} />}>Quarterly report.pdf</ContextMenuTrigger>
 * ```
 */
const ContextMenuTrigger = ({ref, ...props}: Readonly<ContextMenuTrigger.Props>): React.ReactElement => {
  const {children, render, className, ...otherProps} = props;
  return (
    <BaseContextMenu.Trigger
      data-slot='context-menu-trigger'
      ref={ref}
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
      render={withContextChildren(render, children)}
      {...otherProps}>
      {children}
    </BaseContextMenu.Trigger>
  );
};
ContextMenuTrigger.displayName = "ContextMenuTrigger";

/**
 * Portals the role-bearing Popup beside the pointer.
 *
 * @remarks
 * - Client-only; render inside `ContextMenu`. Renders Portal → Positioner → `role="menu"` Popup; name it with
 *   `aria-label`. Popup names, events, ref, `finalFocus` and render/class callbacks remain on the Popup.
 * - Placement defaults: `side="inline-end"` (right of the pointer in LTR, left in RTL), `align="start"`,
 *   `sideOffset={0}` and `alignOffset={4}`. `positionerProps` and `portalProps` reach the internal parts.
 * - Writes `dir="rtl"` only under an RTL `DirectionProvider`; otherwise it writes no `dir` and the portaled popup inherits
 *   the document direction, because Base UI's `useDirection()` also reports `"ltr"` without a provider. An explicit LTR
 *   provider inside an RTL document therefore needs `dir="ltr"` here; a caller's `dir` always wins. Without an RTL
 *   `DirectionProvider`, Base UI keeps LTR submenu placement and arrow keys, so RTL apps should wrap in
 *   `DirectionProvider direction="rtl"`.
 *
 * @example
 * ```tsx
 * <ContextMenuContent aria-label='Canvas actions'>
 *   <ContextMenuItem onClick={paste}>Paste</ContextMenuItem>
 * </ContextMenuContent>
 * ```
 */
const ContextMenuContent = ({ref, ...props}: Readonly<ContextMenuContent.Props>): React.ReactElement => {
  const direction = useDirection();
  const {
    align = "start",
    alignOffset = 4,
    side = "inline-end",
    sideOffset = 0,
    anchor,
    collisionBoundary,
    collisionPadding,
    sticky,
    arrowPadding,
    disableAnchorTracking,
    collisionAvoidance,
    positionerProps,
    portalProps,
    className,
    dir = direction === "rtl" ? "rtl" : undefined,
    children,
    render,
    ...popupProps
  } = props;
  const {className: positionerClassName, render: positionerRender, ...positionerNativeProps} = positionerProps ?? {};
  const {render: portalRender, ...portalNativeProps} = portalProps ?? {};
  const popup = (
    <BaseContextMenu.Popup
      data-slot='context-menu-content'
      ref={ref}
      dir={dir}
      render={withContextChildren(render, children)}
      className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}
      {...popupProps}>
      {children}
    </BaseContextMenu.Popup>
  );
  const positioner = (
    <BaseContextMenu.Positioner
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      anchor={anchor}
      collisionBoundary={collisionBoundary}
      collisionPadding={collisionPadding}
      sticky={sticky}
      arrowPadding={arrowPadding}
      disableAnchorTracking={disableAnchorTracking}
      collisionAvoidance={collisionAvoidance}
      render={withContextChildren(positionerRender, popup)}
      className={(state) =>
        cn(styles.positioner, typeof positionerClassName === "function" ? positionerClassName(state) : positionerClassName)
      }
      {...positionerNativeProps}>
      {popup}
    </BaseContextMenu.Positioner>
  );
  return (
    <ContextMenuPortal
      render={withContextChildren(portalRender, null)}
      {...portalNativeProps}>
      {positioner}
    </ContextMenuPortal>
  );
};
ContextMenuContent.displayName = "ContextMenuContent";

/**
 * Portals a nested `role="menu"` Popup beside its submenu trigger.
 *
 * @remarks
 * - Client-only; render inside `ContextMenuSub`. Accepts every `ContextMenuContent` prop with the same defaults:
 *   `side="inline-end"` (right in LTR), `align="start"`, `sideOffset={0}` and `alignOffset={4}`.
 *
 * @example
 * ```tsx
 * <ContextMenuSubContent aria-label='Export formats'>
 *   <ContextMenuItem onClick={exportPdf}>PDF</ContextMenuItem>
 * </ContextMenuSubContent>
 * ```
 */
function ContextMenuSubContent(props: Readonly<ContextMenuSubContent.Props>): React.ReactElement {
  const {side = "inline-end", ...otherProps} = props;
  return (
    <ContextMenuContent
      data-slot='context-menu-sub-content'
      side={side}
      {...otherProps}
    />
  );
}

/**
 * Uses the shared corrected Menu item contract; ContextMenu exports this same Base UI primitive.
 *
 * @remarks
 * - Client-only; a `role="menuitem"` whose `onClick` runs for pointer, Enter and Space activation, after which the menu
 *   closes unless `closeOnClick={false}`. Supports `inset`, `variant="destructive"` and link `render` targets.
 *
 * @example
 * ```tsx
 * <ContextMenuItem variant='destructive' onClick={moveToTrash}>
 *   <Trash2 aria-hidden='true' />
 *   Move to trash
 * </ContextMenuItem>
 * ```
 */
function ContextMenuItem(props: Readonly<ContextMenuItem.Props>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuItem
      data-slot='context-menu-item'
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
}

/**
 * Native checkbox row with a relative indicator and unchanged checked/change semantics.
 *
 * @remarks
 * - Client-only; a `role="menuitemcheckbox"` with `aria-checked` and an `aria-hidden` check. The menu stays open after
 *   toggling unless `closeOnClick` is set; `checked`/`onCheckedChange` details are Base UI's.
 *
 * @example
 * ```tsx
 * <ContextMenuCheckboxItem checked={showGrid} onCheckedChange={setShowGrid}>
 *   Show grid
 * </ContextMenuCheckboxItem>
 * ```
 */
function ContextMenuCheckboxItem(props: Readonly<ContextMenuCheckboxItem.Props>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuCheckboxItem
      data-slot='context-menu-checkbox-item'
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
}

/**
 * Native radio row with a relative indicator and unchanged values/change semantics.
 *
 * @remarks
 * - Client-only; render inside `ContextMenuRadioGroup`. A `role="menuitemradio"` with `aria-checked` and an
 *   `aria-hidden` dot; the menu stays open after selection unless `closeOnClick` is set.
 *
 * @example
 * ```tsx
 * <ContextMenuRadioGroup defaultValue='name'>
 *   <ContextMenuLabel>Sort by</ContextMenuLabel>
 *   <ContextMenuRadioItem value='name'>Name</ContextMenuRadioItem>
 *   <ContextMenuRadioItem value='size'>Size</ContextMenuRadioItem>
 * </ContextMenuRadioGroup>
 * ```
 */
function ContextMenuRadioItem(props: Readonly<ContextMenuRadioItem.Props>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuRadioItem
      data-slot='context-menu-radio-item'
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
}

/**
 * Native submenu activation with the shared logical inset and RTL decorative arrow.
 *
 * @remarks
 * - Client-only; render inside `ContextMenuSub`. A `role="menuitem"` with `aria-haspopup="menu"` whose `aria-hidden`
 *   chevron mirrors under an RTL `DirectionProvider`, where Base UI opens the submenu toward the left; `inset` aligns it
 *   with indicator rows.
 *
 * @example
 * ```tsx
 * <ContextMenuSub>
 *   <ContextMenuSubTrigger>Export as</ContextMenuSubTrigger>
 *   <ContextMenuSubContent aria-label='Export formats'>
 *     <ContextMenuItem onClick={exportPng}>PNG</ContextMenuItem>
 *   </ContextMenuSubContent>
 * </ContextMenuSub>
 * ```
 */
function ContextMenuSubTrigger(props: Readonly<ContextMenuSubTrigger.Props>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuSubTrigger
      data-slot='context-menu-sub-trigger'
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
}

/**
 * Names the surrounding real primitive group.
 *
 * @remarks
 * - Client-only; render as a child of `ContextMenuGroup` or `ContextMenuRadioGroup`, which Base UI labels with it. It
 *   does not name the popup; give `ContextMenuContent` an `aria-label` for that.
 *
 * @example
 * ```tsx
 * <ContextMenuGroup>
 *   <ContextMenuLabel inset>Appearance</ContextMenuLabel>
 *   <ContextMenuCheckboxItem inset>Show rulers</ContextMenuCheckboxItem>
 * </ContextMenuGroup>
 * ```
 */
function ContextMenuLabel(props: Readonly<ContextMenuLabel.Props>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuLabel
      data-slot='context-menu-label'
      className={(state) => cn(styles.label, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
}
/**
 * Separates sections with the shared real Menu separator.
 *
 * @remarks
 * - Client-only; a non-focusable `role="separator"` between groups of items.
 *
 * @example
 * ```tsx
 * <ContextMenuContent aria-label='Layer actions'>
 *   <ContextMenuItem>Duplicate</ContextMenuItem>
 *   <ContextMenuSeparator />
 *   <ContextMenuItem variant='destructive'>Delete layer</ContextMenuItem>
 * </ContextMenuContent>
 * ```
 */
function ContextMenuSeparator(props: Readonly<ContextMenuSeparator.Props>): React.ReactElement {
  return (
    <DropdownMenuSeparator
      data-slot='context-menu-separator'
      {...props}
    />
  );
}
/**
 * Shows a shortcut hint without registering keyboard handlers.
 *
 * @remarks
 * - Presentation only: its text joins the item's accessible name. Register the real shortcut yourself and expose it
 *   with `aria-keyshortcuts` on the item.
 *
 * @example
 * ```tsx
 * <ContextMenuItem onClick={undo} aria-keyshortcuts='Control+Z'>
 *   Undo
 *   <ContextMenuShortcut>Ctrl+Z</ContextMenuShortcut>
 * </ContextMenuItem>
 * ```
 */
function ContextMenuShortcut(props: Readonly<ContextMenuShortcut.Props>): React.ReactElement {
  return (
    <DropdownMenuShortcut
      data-slot='context-menu-shortcut'
      {...props}
    />
  );
}

// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenu {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuProps;
  export type State = BaseContextMenu.Root.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuGroupProps;
  export type State = BaseContextMenu.Group.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuPortal {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuPortalProps;
  export type State = BaseContextMenu.Portal.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuRadioGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuRadioGroupProps;
  export type State = BaseContextMenu.RadioGroup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuSub {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuSubProps;
  export type State = BaseContextMenu.SubmenuRoot.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuTriggerProps;
  export type State = BaseContextMenu.Trigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuContentProps;
  export type State = BaseContextMenu.Popup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuSubContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuContentProps;
  export type State = BaseContextMenu.Popup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuItemProps;
  export type State = BaseContextMenu.Item.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuCheckboxItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuCheckboxItemProps;
  export type State = BaseContextMenu.CheckboxItem.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuRadioItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuRadioItemProps;
  export type State = BaseContextMenu.RadioItem.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuSubTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuSubTriggerProps;
  export type State = BaseContextMenu.SubmenuTrigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuLabel {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuLabelProps;
  export type State = BaseContextMenu.GroupLabel.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuSeparator {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuSeparatorProps;
  export type State = BaseContextMenu.Separator.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuShortcut {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuShortcutProps;
  export type State = DropdownMenuShortcut.State;
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
