"use client";

import {Menu as BaseMenu} from "@base-ui/react/menu";
import {useDirection} from "@base-ui/react/direction-provider";
import type {ComponentRenderFn, HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import {Check, ChevronRight, Circle} from "lucide-react";
import * as React from "react";

import {useMergedRefs} from "@/hooks/useMergedRefs";
import {cn} from "@/lib/utilities";
import styles from "./dropdown-menu.module.css";

/** Readonly state and payload options owned by the Menu root. */
export type DropdownMenuProps<Payload = unknown> = Readonly<BaseMenu.Root.Props<Payload>>;
/** Accessible group props including primitive state-aware render and class callbacks. */
export type DropdownMenuGroupProps = Readonly<React.ComponentPropsWithRef<typeof BaseMenu.Group>>;
/** Real Portal props including container, keepMounted, render and DOM ref. */
export type DropdownMenuPortalProps = Readonly<React.ComponentPropsWithRef<typeof BaseMenu.Portal>>;
/** Native radio-group props, retaining upstream value and event-detail types. */
export type DropdownMenuRadioGroupProps = Readonly<React.ComponentPropsWithRef<typeof BaseMenu.RadioGroup>>;
/** Native submenu-root options; no additional GUI state is introduced. */
export type DropdownMenuSubProps = Readonly<BaseMenu.SubmenuRoot.Props>;
/** Primitive trigger props, including polymorphic React 19 HTMLElement refs. */
export type DropdownMenuTriggerProps<Payload = unknown> = Readonly<
  Omit<BaseMenu.Trigger.Props<Payload>, "ref"> & React.RefAttributes<HTMLElement>
>;
/** Primitive submenu trigger options with logical inset spacing. */
export type DropdownMenuSubTriggerProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.SubmenuTrigger> & {
    /** Align text with indicator rows. @default false */
    inset?: boolean;
  }
>;

type DropdownMenuPositioningProps = Omit<BaseMenu.Positioner.Props, keyof BaseMenu.Popup.Props | "align" | "sideOffset"> & {
  /** How to align the popup relative to `side`; collision handling may adjust it. @default "start" */
  align?: BaseMenu.Positioner.Props["align"];
  /** Distance in pixels between the trigger and the popup, or a function of their sizes, side and alignment. @default 4 */
  sideOffset?: BaseMenu.Positioner.Props["sideOffset"];
};
type MenuDataAttributes = {readonly [key: `data-${string}`]: string | number | boolean | undefined};

/** Popup props target the role-bearing menu; placement options target its Positioner. */
export type DropdownMenuContentProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.Popup>
    & DropdownMenuPositioningProps & {
      /** Additional Positioner DOM, ref, render and state-class props. */
      positionerProps?: Readonly<
        Omit<React.ComponentPropsWithRef<typeof BaseMenu.Positioner>, keyof DropdownMenuPositioningProps | "children"> & MenuDataAttributes
      >;
      /** Portal options. Nested modal menus should target the enclosing primitive Portal, not an external sibling. */
      portalProps?: Readonly<Omit<React.ComponentPropsWithRef<typeof BaseMenu.Portal>, "children"> & MenuDataAttributes>;
    }
>;
/** Submenu popup props: the content contract with placement defaults that open beside the submenu trigger. */
type DropdownMenuSubContentProps = Readonly<
  Omit<DropdownMenuContentProps, "alignOffset" | "side" | "sideOffset"> & {
    /** Offset in pixels along the alignment axis, or a function of the trigger and popup sizes. @default -3 */
    alignOffset?: BaseMenu.Positioner.Props["alignOffset"];
    /** Side of the submenu trigger to open on; collision handling may flip it. @default "inline-end" */
    side?: BaseMenu.Positioner.Props["side"];
    /** Distance in pixels between the submenu trigger and the popup, or a function of their sizes. @default 0 */
    sideOffset?: BaseMenu.Positioner.Props["sideOffset"];
  }
>;
/** Primitive item props with presentation-only variants. */
export type DropdownMenuItemProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.Item> & {
    /** Align text with indicator rows. @default false */
    inset?: boolean;
    /** Visual treatment without changing activation behavior. @default "default" */
    variant?: "default" | "destructive";
  }
>;
/** Native checkbox options; checked values and change details are not adapted. */
export type DropdownMenuCheckboxItemProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.CheckboxItem> & {
    /** Add a further logical inset to the indicator row. @default false */
    inset?: boolean;
  }
>;
/** Native radio options with optional logical inset spacing. */
export type DropdownMenuRadioItemProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.RadioItem> & {
    /** Add a further logical inset to the indicator row. @default false */
    inset?: boolean;
  }
>;
/** Primitive group label props with optional logical inset spacing. */
export type DropdownMenuLabelProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.GroupLabel> & {
    /** Align text with indicator rows. @default false */
    inset?: boolean;
  }
>;
/** Primitive separator props. */
export type DropdownMenuSeparatorProps = Readonly<React.ComponentPropsWithRef<typeof BaseMenu.Separator>>;
/** Presentation-only shortcut props with native span refs and render composition. */
export type DropdownMenuShortcutProps = Readonly<
  React.ComponentPropsWithRef<"span"> & {
    /** Replace the span while preserving its props. */
    render?: useRender.RenderProp<Record<string, never>>;
  }
>;

type MenuRender<State> = React.ReactElement | ComponentRenderFn<HTMLProps, State> | undefined;

function getMenuRenderElement<State>(render: MenuRender<State>): React.ReactElement<{children?: React.ReactNode}> | undefined {
  if (typeof render === "function") return undefined;
  // eslint-disable-next-line react-x/no-children-to-array -- React's public resolver unwraps Flight-lazy render elements supported by Base UI.
  const [element] = React.Children.toArray(render);
  return React.isValidElement<{children?: React.ReactNode}>(element) ? element : undefined;
}

function getMenuChildren<State>(children: React.ReactNode, render: MenuRender<State>): React.ReactNode {
  return children === undefined ? getMenuRenderElement(render)?.props.children : children;
}

function withMenuChildren<State>(render: MenuRender<State>, children: React.ReactNode): MenuRender<State> {
  if (render === undefined || typeof render === "function") return render;
  return function renderMenuElement(elementProps): React.ReactElement {
    return (
      <MenuElement
        render={render}
        elementProps={elementProps}>
        {children}
      </MenuElement>
    );
  };
}

/** Normalization belongs to a mounted primitive, never an unopened popup wrapper. */
function MenuElement({
  render,
  elementProps,
  children,
}: Readonly<{render: React.ReactElement; elementProps: HTMLProps; children: React.ReactNode}>): React.ReactElement {
  const element = getMenuRenderElement(render);
  if (!element || element.type === React.Fragment) throw new TypeError("Menu render requires a single non-Fragment React element.");
  // eslint-disable-next-line react-x/no-clone-element -- replace compound children while preserving primitive ref/event composition.
  return useRender({render: React.cloneElement(element, {children}), props: {...elementProps}});
}

/**
 * Coordinates a Base UI Menu's open state, modality, focus and typeahead without rendering a DOM wrapper.
 *
 * @remarks
 * - Client-only (`"use client"`): compose a `DropdownMenuTrigger` and a `DropdownMenuContent` inside it.
 * - Base UI owns open state, focus return, payloads and detached `handle` triggers. `modal` defaults to `true`:
 *   while open, page scroll is locked and outside pointer interaction is blocked.
 * - `onOpenChange` receives cancellable Base UI change details; call `details.cancel()` to keep the current state.
 *
 * @example
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenuTrigger render={<Button variant='outline' />}>Account</DropdownMenuTrigger>
 *   <DropdownMenuContent aria-label='Account actions'>
 *     <DropdownMenuItem onClick={openProfile}>Profile</DropdownMenuItem>
 *     <DropdownMenuItem variant='destructive' onClick={signOut}>Sign out</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 * ```
 */
function DropdownMenu<Payload>(props: Readonly<DropdownMenu.Props<Payload>>): React.JSX.Element {
  return <BaseMenu.Root {...props} />;
}

/**
 * Groups related menu items with the primitive's `role="group"` semantics.
 *
 * @remarks
 * - Client-only; render inside `DropdownMenuContent` or `DropdownMenuSubContent`.
 * - Name the group with a `DropdownMenuLabel` child, which Base UI wires up through `aria-labelledby`.
 *
 * @example
 * ```tsx
 * <DropdownMenuGroup>
 *   <DropdownMenuLabel>Account</DropdownMenuLabel>
 *   <DropdownMenuItem>Profile</DropdownMenuItem>
 *   <DropdownMenuItem>Billing</DropdownMenuItem>
 * </DropdownMenuGroup>
 * ```
 */
const DropdownMenuGroup = BaseMenu.Group;
/**
 * Hosts menu content in the primitive portal, supporting custom document containers.
 *
 * @remarks
 * - Client-only. `DropdownMenuContent` already renders this Portal; configure it there with `portalProps` and use this
 *   part only when composing raw Base UI `Menu.Positioner`/`Menu.Popup` parts.
 * - `container` selects the element or shadow root that receives the portal; `keepMounted` keeps closed content mounted.
 *
 * @example
 * ```tsx
 * <DropdownMenuPortal container={shadowRoot}>
 *   <Menu.Positioner sideOffset={4}>
 *     <Menu.Popup aria-label='Actions'>…</Menu.Popup>
 *   </Menu.Positioner>
 * </DropdownMenuPortal>
 * ```
 */
const DropdownMenuPortal = BaseMenu.Portal;
/**
 * Owns a single-choice value for its `DropdownMenuRadioItem` children.
 *
 * @remarks
 * - Client-only; renders a `role="group"` element inside the menu. Name it with a `DropdownMenuLabel` child.
 * - Controlled `value`/`onValueChange` or uncontrolled `defaultValue`; values (including `null`) and the cancellable
 *   change details are Base UI's, unadapted.
 *
 * @example
 * ```tsx
 * <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
 *   <DropdownMenuLabel>Sort by</DropdownMenuLabel>
 *   <DropdownMenuRadioItem value='name'>Name</DropdownMenuRadioItem>
 *   <DropdownMenuRadioItem value='modified'>Date modified</DropdownMenuRadioItem>
 * </DropdownMenuRadioGroup>
 * ```
 */
const DropdownMenuRadioGroup = BaseMenu.RadioGroup;
/**
 * Coordinates a nested menu: its open state, keyboard behavior and Escape handling, without a DOM wrapper.
 *
 * @remarks
 * - Client-only; wrap exactly one `DropdownMenuSubTrigger` and one `DropdownMenuSubContent`.
 * - The trigger opens the submenu on hover (after its 100 ms `delay`), click, Enter, Space or the inline-end arrow key
 *   (ArrowRight in LTR, ArrowLeft in RTL). Escape closes only the submenu unless `closeParentOnEsc` is set.
 *
 * @example
 * ```tsx
 * <DropdownMenuSub>
 *   <DropdownMenuSubTrigger>Share</DropdownMenuSubTrigger>
 *   <DropdownMenuSubContent aria-label='Share options'>
 *     <DropdownMenuItem onClick={copyLink}>Copy link</DropdownMenuItem>
 *   </DropdownMenuSubContent>
 * </DropdownMenuSub>
 * ```
 */
const DropdownMenuSub = BaseMenu.SubmenuRoot;

/**
 * Opens a menu with the primitive's native button behavior by default.
 *
 * @remarks
 * - Client-only; render inside `DropdownMenu`. Base UI sets `aria-haspopup="menu"` and `aria-expanded`.
 * - Compose a styled control with `render={<Button />}`. Set `nativeButton={false}` for non-button render targets.
 * - Icon-only triggers need an accessible name such as `aria-label`.
 *
 * @example
 * ```tsx
 * <DropdownMenuTrigger render={<Button variant='ghost' size='icon' aria-label='More actions' />}>
 *   <MoreHorizontal aria-hidden='true' />
 * </DropdownMenuTrigger>
 * ```
 */
function DropdownMenuTrigger<Payload = unknown>(props: Readonly<DropdownMenuTrigger.Props<Payload>>): React.JSX.Element {
  const {ref, children, render, nativeButton, className, ...otherProps} = props;
  const primitiveRef = useMergedRefs(ref);
  return (
    <BaseMenu.Trigger
      data-slot='dropdown-menu-trigger'
      ref={primitiveRef}
      className={(state) => cn(styles.trigger, typeof className === "function" ? className(state) : className)}
      nativeButton={nativeButton}
      render={children === undefined ? render : withMenuChildren(render, children)}
      {...otherProps}>
      {children}
    </BaseMenu.Trigger>
  );
}
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

/**
 * Opens a submenu, retaining primitive render/class state and a direction-aware decorative arrow.
 *
 * @remarks
 * - Client-only; render inside `DropdownMenuSub`. Base UI renders a `role="menuitem"` element with
 *   `aria-haspopup="menu"` and exposes the submenu's `open` state to `className`/`render` callbacks.
 * - The trailing chevron is `aria-hidden` and mirrors only under an RTL `DirectionProvider`, the direction Base UI uses to
 *   place the submenu and map its arrow keys; a document `dir="rtl"` alone keeps both, and the chevron, LTR.
 * - `inset` aligns the text with indicator rows; `openOnHover`, `delay` and `closeDelay` tune pointer opening.
 *
 * @example
 * ```tsx
 * <DropdownMenuSub>
 *   <DropdownMenuSubTrigger inset>Move to</DropdownMenuSubTrigger>
 *   <DropdownMenuSubContent aria-label='Destinations'>
 *     <DropdownMenuItem onClick={moveToArchive}>Archive</DropdownMenuItem>
 *   </DropdownMenuSubContent>
 * </DropdownMenuSub>
 * ```
 */
const DropdownMenuSubTrigger = ({ref, ...props}: Readonly<DropdownMenuSubTrigger.Props>): React.ReactElement => {
  const direction = useDirection();
  const {className, children, inset = false, render, ...otherProps} = props;
  const content = (
    <>
      {getMenuChildren(children, render)}
      <ChevronRight
        aria-hidden='true'
        data-direction={direction}
        className={styles.subTriggerIcon}
      />
    </>
  );
  return (
    <BaseMenu.SubmenuTrigger
      data-slot='dropdown-menu-sub-trigger'
      data-inset={inset}
      ref={ref}
      className={(state) =>
        cn(styles.item, styles.subTrigger, inset && styles.inset, typeof className === "function" ? className(state) : className)
      }
      render={withMenuChildren(render, content)}
      {...otherProps}>
      {content}
    </BaseMenu.SubmenuTrigger>
  );
};
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

/**
 * Portals and positions the role-bearing Popup.
 *
 * @remarks
 * - Client-only; render inside `DropdownMenu`. Renders Portal → Positioner → `role="menu"` Popup.
 * - Popup ARIA, event handlers, render state, class callbacks, ref and `finalFocus` never land on the positioning
 *   container. Name the popup with `aria-label` when the trigger text is not a sufficient name (Base UI otherwise
 *   labels it by the trigger).
 * - Placement props target the Positioner and default to `align="start"`, `sideOffset={4}` and `alignOffset={0}`.
 *   `side` stays unset unless provided, so Base UI opens root menus below the trigger and Menubar menus below a
 *   horizontal or toward the inline end of a vertical Menubar.
 * - `positionerProps` and `portalProps` reach the internal Positioner and Portal (for example `portalProps.container`).
 * - Writes `dir="rtl"` only under an RTL `DirectionProvider`; otherwise it writes no `dir` and the portaled popup inherits
 *   the document direction, because Base UI's `useDirection()` also reports `"ltr"` without a provider. An explicit LTR
 *   provider inside an RTL document therefore needs `dir="ltr"` here; a caller's `dir` always wins. Without an RTL
 *   `DirectionProvider`, Base UI keeps LTR submenu placement and arrow keys, so RTL apps should wrap in
 *   `DirectionProvider direction="rtl"`.
 *
 * @example
 * ```tsx
 * <DropdownMenuContent aria-label='Project actions' align='end' portalProps={{container: dialogElement}}>
 *   <DropdownMenuItem onClick={rename}>Rename</DropdownMenuItem>
 * </DropdownMenuContent>
 * ```
 */
const DropdownMenuContent = ({ref, ...props}: Readonly<DropdownMenuContent.Props>): React.ReactElement => {
  const direction = useDirection();
  const {
    align = "start",
    alignOffset = 0,
    side,
    sideOffset = 4,
    anchor,
    positionMethod,
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
    <BaseMenu.Popup
      data-slot='dropdown-menu-content'
      ref={ref}
      dir={dir}
      render={children === undefined ? render : withMenuChildren(render, children)}
      className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}
      {...popupProps}>
      {children}
    </BaseMenu.Popup>
  );
  const positioner = (
    <BaseMenu.Positioner
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      anchor={anchor}
      positionMethod={positionMethod}
      collisionBoundary={collisionBoundary}
      collisionPadding={collisionPadding}
      sticky={sticky}
      arrowPadding={arrowPadding}
      disableAnchorTracking={disableAnchorTracking}
      collisionAvoidance={collisionAvoidance}
      render={withMenuChildren(positionerRender, popup)}
      className={(state) =>
        cn(styles.positioner, typeof positionerClassName === "function" ? positionerClassName(state) : positionerClassName)
      }
      {...positionerNativeProps}>
      {popup}
    </BaseMenu.Positioner>
  );
  return (
    <DropdownMenuPortal
      render={withMenuChildren(portalRender, null)}
      {...portalNativeProps}>
      {positioner}
    </DropdownMenuPortal>
  );
};
DropdownMenuContent.displayName = "DropdownMenuContent";

/**
 * Portals a nested `role="menu"` Popup beside its submenu trigger.
 *
 * @remarks
 * - Client-only; render inside `DropdownMenuSub` after its `DropdownMenuSubTrigger`.
 * - Accepts every `DropdownMenuContent` prop with submenu placement defaults: `side="inline-end"` (right in LTR, left
 *   in RTL), `align="start"`, `sideOffset={0}` and `alignOffset={-3}`.
 *
 * @example
 * ```tsx
 * <DropdownMenuSubContent aria-label='Share options'>
 *   <DropdownMenuItem onClick={emailLink}>Email link</DropdownMenuItem>
 * </DropdownMenuSubContent>
 * ```
 */
const DropdownMenuSubContent = ({ref, ...props}: Readonly<DropdownMenuSubContent.Props>): React.ReactElement => {
  const {align = "start", alignOffset = -3, side = "inline-end", sideOffset = 0, ...otherProps} = props;
  return (
    <DropdownMenuContent
      data-slot='dropdown-menu-sub-content'
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      ref={ref}
      {...otherProps}
    />
  );
};
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

/**
 * Activates a primitive-owned menu item with optional inset and destructive presentation.
 *
 * @remarks
 * - Client-only; render inside menu content. Base UI renders a `role="menuitem"` `<div>`; `onClick` runs for pointer,
 *   Enter and Space activation, after which the menu closes unless `closeOnClick={false}`.
 * - For navigation, render a link with `render={<a href='/billing' />}` (and `nativeButton={false}`, the default).
 * - `variant="destructive"` changes only the color treatment; `label` overrides the typeahead text.
 *
 * @example
 * ```tsx
 * <DropdownMenuItem variant='destructive' onClick={deleteProject}>
 *   <Trash2 aria-hidden='true' />
 *   Delete project
 * </DropdownMenuItem>
 * ```
 */
const DropdownMenuItem = ({ref, ...props}: Readonly<DropdownMenuItem.Props>): React.ReactElement => {
  const {children, className, inset = false, variant = "default", render, nativeButton, ...otherProps} = props;
  return (
    <BaseMenu.Item
      data-slot='dropdown-menu-item'
      data-inset={inset}
      data-variant={variant}
      ref={ref}
      nativeButton={nativeButton}
      className={(state) => cn(styles.item, inset && styles.inset, typeof className === "function" ? className(state) : className)}
      render={children === undefined ? render : withMenuChildren(render, children)}
      {...otherProps}>
      {children}
    </BaseMenu.Item>
  );
};
DropdownMenuItem.displayName = "DropdownMenuItem";

/**
 * Toggles the real Menu checkbox; its indicator and label share the render target.
 *
 * @remarks
 * - Client-only; Base UI renders a `role="menuitemcheckbox"` with `aria-checked`, and the decorative check is
 *   `aria-hidden`. The menu stays open after toggling unless `closeOnClick` is set.
 * - Controlled `checked`/`onCheckedChange` or uncontrolled `defaultChecked`, with cancellable Base UI change details.
 * - `inset` adds a further logical inset for rows nested under an inset label.
 *
 * @example
 * ```tsx
 * <DropdownMenuCheckboxItem checked={showToolbar} onCheckedChange={setShowToolbar}>
 *   Show toolbar
 * </DropdownMenuCheckboxItem>
 * ```
 */
const DropdownMenuCheckboxItem = ({ref, ...props}: Readonly<DropdownMenuCheckboxItem.Props>): React.ReactElement => {
  const {className, children, inset = false, render, ...otherProps} = props;
  const content = (
    <>
      <span className={styles.indicatorSlot}>
        <BaseMenu.CheckboxItemIndicator>
          <Check
            aria-hidden='true'
            className={styles.indicatorIcon}
          />
        </BaseMenu.CheckboxItemIndicator>
      </span>
      {getMenuChildren(children, render)}
    </>
  );
  return (
    <BaseMenu.CheckboxItem
      data-slot='dropdown-menu-checkbox-item'
      data-inset={inset}
      ref={ref}
      className={(state) =>
        cn(
          styles.item,
          styles.indicatorItem,
          inset && styles.indicatorInset,
          typeof className === "function" ? className(state) : className,
        )
      }
      render={withMenuChildren(render, content)}
      {...otherProps}>
      {content}
    </BaseMenu.CheckboxItem>
  );
};
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

/**
 * Selects a native Menu radio value with an indicator relative to its own row.
 *
 * @remarks
 * - Client-only; render inside `DropdownMenuRadioGroup`. Base UI renders a `role="menuitemradio"` with `aria-checked`,
 *   and the decorative dot is `aria-hidden`. The menu stays open after selection unless `closeOnClick` is set.
 * - `value` identifies the option within its group; `inset` adds a further logical inset.
 *
 * @example
 * ```tsx
 * <DropdownMenuRadioGroup defaultValue='comfortable'>
 *   <DropdownMenuLabel>Density</DropdownMenuLabel>
 *   <DropdownMenuRadioItem value='comfortable'>Comfortable</DropdownMenuRadioItem>
 *   <DropdownMenuRadioItem value='compact'>Compact</DropdownMenuRadioItem>
 * </DropdownMenuRadioGroup>
 * ```
 */
const DropdownMenuRadioItem = ({ref, ...props}: Readonly<DropdownMenuRadioItem.Props>): React.ReactElement => {
  const {className, children, inset = false, render, ...otherProps} = props;
  const content = (
    <>
      <span className={styles.indicatorSlot}>
        <BaseMenu.RadioItemIndicator>
          <Circle
            aria-hidden='true'
            className={styles.radioIndicatorIcon}
          />
        </BaseMenu.RadioItemIndicator>
      </span>
      {getMenuChildren(children, render)}
    </>
  );
  return (
    <BaseMenu.RadioItem
      data-slot='dropdown-menu-radio-item'
      data-inset={inset}
      ref={ref}
      className={(state) =>
        cn(
          styles.item,
          styles.indicatorItem,
          inset && styles.indicatorInset,
          typeof className === "function" ? className(state) : className,
        )
      }
      render={withMenuChildren(render, content)}
      {...otherProps}>
      {content}
    </BaseMenu.RadioItem>
  );
};
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

/**
 * Names the surrounding primitive Menu group; not a substitute for Popup aria-label.
 *
 * @remarks
 * - Client-only; render as a child of `DropdownMenuGroup` or `DropdownMenuRadioGroup`, which Base UI labels with it
 *   through `aria-labelledby`. It is not focusable and does not name the popup itself.
 * - `inset` aligns the text with indicator rows.
 *
 * @example
 * ```tsx
 * <DropdownMenuGroup>
 *   <DropdownMenuLabel inset>Appearance</DropdownMenuLabel>
 *   <DropdownMenuCheckboxItem inset>Show sidebar</DropdownMenuCheckboxItem>
 * </DropdownMenuGroup>
 * ```
 */
const DropdownMenuLabel = ({ref, ...props}: Readonly<DropdownMenuLabel.Props>): React.ReactElement => {
  const {className, children, render, inset = false, ...otherProps} = props;
  return (
    <BaseMenu.GroupLabel
      data-slot='dropdown-menu-label'
      data-inset={inset}
      ref={ref}
      render={children === undefined ? render : withMenuChildren(render, children)}
      className={(state) => cn(styles.label, inset && styles.inset, typeof className === "function" ? className(state) : className)}
      {...otherProps}>
      {children}
    </BaseMenu.GroupLabel>
  );
};
DropdownMenuLabel.displayName = "DropdownMenuLabel";

/**
 * Separates Menu sections using the real separator primitive and its render state.
 *
 * @remarks
 * - Client-only; renders a `role="separator"` element between groups of items. It is not focusable.
 *
 * @example
 * ```tsx
 * <DropdownMenuContent aria-label='File actions'>
 *   <DropdownMenuItem>Rename</DropdownMenuItem>
 *   <DropdownMenuSeparator />
 *   <DropdownMenuItem variant='destructive'>Delete</DropdownMenuItem>
 * </DropdownMenuContent>
 * ```
 */
const DropdownMenuSeparator = ({ref, ...props}: Readonly<DropdownMenuSeparator.Props>): React.ReactElement => {
  const {className, ...otherProps} = props;
  return (
    <BaseMenu.Separator
      data-slot='dropdown-menu-separator'
      ref={ref}
      className={(state) => cn(styles.separator, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
};
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

/**
 * Displays a trailing shortcut hint; does not register a keyboard shortcut.
 *
 * @remarks
 * - Presentation only: a `<span>` (or `render` target) whose text joins the item's accessible name. Register the
 *   real shortcut yourself and expose it with `aria-keyshortcuts` on the item.
 *
 * @example
 * ```tsx
 * <DropdownMenuItem onClick={copy} aria-keyshortcuts='Control+C'>
 *   Copy
 *   <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
 * </DropdownMenuItem>
 * ```
 */
const DropdownMenuShortcut = ({ref, ...props}: Readonly<DropdownMenuShortcut.Props>): React.ReactElement => {
  const {children, className, render, ...otherProps} = props;
  return useRender({
    defaultTagName: "span",
    ref,
    render: children === undefined ? render : withMenuChildren(render, children),
    props: {
      "data-slot": "dropdown-menu-shortcut",
      className: cn(styles.shortcut, className),
      ...(children === undefined ? {} : {children}),
      ...otherProps,
    },
  });
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenu {
  export type Props<Payload = unknown> = DropdownMenuProps<Payload>;
  export type State = BaseMenu.Root.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuGroupProps;
  export type State = BaseMenu.Group.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuPortal {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuPortalProps;
  export type State = BaseMenu.Portal.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuRadioGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuRadioGroupProps;
  export type State = BaseMenu.RadioGroup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuSub {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuSubProps;
  export type State = BaseMenu.SubmenuRoot.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuTrigger {
  export type Props<Payload = unknown> = DropdownMenuTriggerProps<Payload>;
  export type State = BaseMenu.Trigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuSubTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuSubTriggerProps;
  export type State = BaseMenu.SubmenuTrigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuContentProps;
  export type State = BaseMenu.Popup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuSubContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuSubContentProps;
  export type State = BaseMenu.Popup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuItemProps;
  export type State = BaseMenu.Item.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuCheckboxItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuCheckboxItemProps;
  export type State = BaseMenu.CheckboxItem.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuRadioItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuRadioItemProps;
  export type State = BaseMenu.RadioItem.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuLabel {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuLabelProps;
  export type State = BaseMenu.GroupLabel.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuSeparator {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuSeparatorProps;
  export type State = BaseMenu.Separator.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuShortcut {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuShortcutProps;
  export type State = Record<string, never>;
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
