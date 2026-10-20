"use client";

import {Button as BaseButton} from "@base-ui/react/button";
import {useDirection} from "@base-ui/react/direction-provider";
import type {Drawer as BaseDrawer} from "@base-ui/react/drawer";
import type {Menu as BaseMenu} from "@base-ui/react/menu";
import type {BaseUIEvent, ComponentRenderFn, HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import {ChevronRight} from "lucide-react";
import * as React from "react";
import {
  cancelActivation,
  contentOf,
  isActivationCancelled,
  NavigationContext,
  RootContext,
  SubContext,
  useDrawerPresentation,
  usePublishedPanelTitle,
  useRoot,
  useSubmenu,
  useSubmenuCompletion,
  useTriggerText,
  withChildren,
} from "./_dropdrawer";
import {MobileContent, MobileSubContent} from "./_dropdrawer-mobile";

import {useMergedRefs} from "@/hooks/useMergedRefs";
import {cn} from "@/lib/utilities";
import {Drawer, DrawerClose, DrawerTrigger} from "./drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  type DropdownMenuContentProps,
} from "./dropdown-menu";
import styles from "./dropdrawer.module.css";
type RenderProp<State> = React.ReactElement | ComponentRenderFn<HTMLProps, State>;
type StateClassName<State> = string | ((state: State) => string | undefined);
type ResponsiveHandler<Value> = Value extends (event: infer Event) => infer Result
  ? Event extends React.SyntheticEvent<HTMLElement>
    ? (event: BaseUIEvent<Event>) => Result
    : Value
  : Value;
type ResponsiveDOMEvents = {
  [Key in keyof React.DOMAttributes<HTMLElement>]: ResponsiveHandler<React.DOMAttributes<HTMLElement>[Key]>;
};
/** The real SDK change details from whichever responsive owner is currently mounted. */
export type DropDrawerOpenChangeDetails = BaseMenu.Root.ChangeEventDetails | BaseDrawer.Root.ChangeEventDetails;
/** Root state is branch-neutral; handles attach only to their matching SDK owner. */
export type DropDrawerProps<Payload = unknown> = Readonly<
  Omit<BaseMenu.Root.Props<Payload>, "modal" | "onOpenChange" | "handle">
    & Omit<BaseDrawer.Root.Props<Payload>, keyof BaseMenu.Root.Props<Payload>> & {
      /** Drawer trap-focus maps to a modal desktop menu. @default true */
      modal?: BaseDrawer.Root.Props["modal"];
      /** Cancellable SDK requests; a breakpoint or `presentation` change is not an open-change request. */
      onOpenChange?: (open: boolean, details: DropDrawerOpenChangeDetails) => void;
      /** Desktop-only SDK options, including detached handles. Shared open state takes precedence. */
      menuProps?: Readonly<Omit<BaseMenu.Root.Props<Payload>, "children" | "open" | "defaultOpen" | "onOpenChange">>;
      /** Mobile-only SDK options. Shared open state takes precedence. */
      drawerProps?: Readonly<Omit<BaseDrawer.Root.Props<Payload>, "children" | "open" | "defaultOpen" | "onOpenChange">>;
      /** Accessible mobile root panel title. @default "Menu" */
      mobileTitle?: string;
      /** Accessible mobile back control label. @default "Go back" */
      backLabel?: string;
      /**
       * Chooses the SDK owner. `"responsive"` renders the desktop Menu and switches to the mobile Drawer while
       * `(max-width: 767px)` matches (the `useIsMobile` breakpoint). That query reports `false` during server rendering
       * and hydration, so `"responsive"` renders the Menu first and narrow viewports switch after hydration. `"menu"` and
       * `"drawer"` always render that owner, on the server too. A change while open migrates like a breakpoint change:
       * openness is kept, mobile submenu navigation resets and no `onOpenChange` request is emitted.
       * @default "responsive"
       */
      presentation?: "responsive" | "menu" | "drawer";
    }
>;
/** The actual trigger state is structurally shared by Drawer and Menu. */
export type DropDrawerTriggerProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof DropdownMenuTrigger>, "handle"> & {
    /** Desktop trigger options, including its SDK-owned detached handle. */
    menuProps?: Readonly<Omit<BaseMenu.Trigger.Props, "children" | "ref" | "render" | "className" | "style" | "disabled" | "nativeButton">>;
    /** Mobile trigger options, including its SDK-owned handle. */
    drawerProps?: Readonly<
      Omit<BaseDrawer.Trigger.Props, "children" | "ref" | "render" | "className" | "style" | "disabled" | "nativeButton">
    >;
  }
>;
/** Actual popup state, never a stateless outer render adapter. */
export type DropDrawerContentState = BaseMenu.Popup.State | BaseDrawer.Popup.State;
/** Shared popup DOM props target the popup; placement targets the desktop Positioner. */
export type DropDrawerContentProps = Readonly<
  Omit<DropdownMenuContentProps, "ref" | "render" | "className" | "style" | "align">
    & Pick<BaseDrawer.Popup.Props, "initialFocus"> & {
      ref?: React.Ref<HTMLElement>;
      render?: RenderProp<DropDrawerContentState>;
      className?: StateClassName<DropDrawerContentState>;
      /** State-aware caller styling is resolved by the actual SDK popup. */
      style?: React.CSSProperties | ((state: DropDrawerContentState) => React.CSSProperties | undefined);
      /** How the desktop menu aligns to its trigger; the mobile Drawer ignores placement. @default "end" */
      align?: DropdownMenuContentProps["align"];
      /** Additional mobile popup options, preserving actual Drawer state callbacks. */
      drawerProps?: Readonly<Omit<BaseDrawer.Popup.Props, "children" | "ref">>;
    }
>;
/** Mobile buttons have only SDK button state; desktop items have actual Menu state. */
export type DropDrawerItemState = BaseMenu.Item.State | BaseButton.State;
/** Native button attributes are available for mobile actions and composed desktop buttons. */
export type DropDrawerItemProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof DropdownMenuItem>, keyof React.DOMAttributes<HTMLElement> | "render" | "className" | "style">
    & ResponsiveDOMEvents
    & Pick<BaseButton.Props, "type" | "name" | "value" | "form" | "formAction"> & {
      render?: RenderProp<DropDrawerItemState>;
      className?: StateClassName<DropDrawerItemState>;
      style?: React.CSSProperties | ((state: DropDrawerItemState) => React.CSSProperties | undefined);
      /** Runs after an uncancelled click; preventDefault cancels closing. */
      onSelect?: (event: Event) => void;
      /** Optional trailing affordance. */
      icon?: React.ReactNode;
    }
>;
/** Accessible group options; mobile groups retain the same labelled relationship. */
export type DropDrawerGroupProps = Readonly<React.ComponentPropsWithRef<typeof DropdownMenuGroup>>;
/** Section labels do not become extra Drawer titles. */
export type DropDrawerLabelProps = Readonly<React.ComponentPropsWithRef<typeof DropdownMenuLabel>>;
/** Separators appear in desktop menus; mobile groups supply their own visual boundaries. */
export type DropDrawerSeparatorProps = Readonly<React.ComponentPropsWithRef<typeof DropdownMenuSeparator>>;
/** Native footer layout composition and ref. */
export type DropDrawerFooterProps = Readonly<Omit<useRender.ComponentProps<"div">, "ref"> & {ref?: React.Ref<HTMLElement>}>;
/** SDK submenu options apply on desktop; mobile open/disabled/callback props coordinate local live panels. */
export type DropDrawerSubProps = Readonly<
  BaseMenu.SubmenuRoot.Props & {
    id?: string;
    /**
     * Localizable heading of this submenu's mobile panel, which also names the drawer dialog while the panel is active.
     * Falls back to the trigger's `label`, then its visible text (excluding `aria-hidden` and `hidden` content), then the
     * root `mobileTitle`; set it for icon-only, `aria-label`-named or badge/count triggers. Desktop menus ignore it.
     */
    title?: string;
  }
>;
/** Mobile uses the Button state; desktop uses the actual SubmenuTrigger state. */
export type DropDrawerSubTriggerState = BaseMenu.SubmenuTrigger.State | BaseButton.State;
/** Cancellable activation callbacks precede mobile drill-down navigation. */
export type DropDrawerSubTriggerProps = Readonly<
  Omit<
    React.ComponentPropsWithRef<typeof DropdownMenuSubTrigger>,
    keyof React.DOMAttributes<HTMLElement> | "render" | "className" | "style"
  >
    & ResponsiveDOMEvents & {
      render?: RenderProp<DropDrawerSubTriggerState>;
      className?: StateClassName<DropDrawerSubTriggerState>;
      style?: React.CSSProperties | ((state: DropDrawerSubTriggerState) => React.CSSProperties | undefined);
    }
>;
/** Mobile panel state belongs to the local navigation owner, not a counterfeit SDK popup. */
export type DropDrawerPanelState = {
  readonly open: boolean;
};
/** Desktop popup or local mobile panel state. */
export type DropDrawerSubContentState = BaseMenu.Popup.State | DropDrawerPanelState;
/** Desktop submenu placement (DropdownMenuSubContent defaults) plus state-aware composition of the live mobile panel. */
export type DropDrawerSubContentProps = Readonly<
  Omit<DropdownMenuSubContent.Props, "ref" | "render" | "className" | "style"> & {
    ref?: React.Ref<HTMLElement>;
    render?: RenderProp<DropDrawerSubContentState>;
    className?: StateClassName<DropDrawerSubContentState>;
    style?: React.CSSProperties | ((state: DropDrawerSubContentState) => React.CSSProperties | undefined);
  }
>;
/** Capture precedes the rendered child's own capture/bubble handlers, without replacing SDK composition. */
function ActivationBoundary({
  children,
  disabled,
  controlRef,
  inline = false,
}: Readonly<{
  children: React.ReactNode;
  disabled: boolean;
  controlRef: React.RefObject<HTMLElement | null>;
  inline?: boolean;
}>): React.JSX.Element {
  const Element = inline ? "span" : "div";
  const handleCapture = (event: React.SyntheticEvent<HTMLElement>): void => {
    if ("key" in event && event.key !== "Enter" && event.key !== " ") return;
    const control = controlRef.current;
    const disabledState = control?.getAttribute("data-disabled");
    const isDisabled =
      disabled
      || control?.matches(":disabled") === true
      || control?.getAttribute("aria-disabled") === "true"
      || (disabledState !== null && disabledState !== undefined && disabledState !== "false");
    if (!isDisabled) return;
    cancelActivation(event);
    event.stopPropagation();
  };

  return (
    <Element
      className={styles.activationBoundary}
      onClickCapture={handleCapture}
      onDoubleClickCapture={handleCapture}
      onAuxClickCapture={handleCapture}
      onKeyDownCapture={handleCapture}
      onKeyUpCapture={handleCapture}>
      {children}
    </Element>
  );
}

/**
 * Responsive SDK Menu/Drawer root with one controlled or uncontrolled open contract.
 *
 * @remarks
 * - Client-only (`"use client"`); renders no DOM wrapper. Compose `DropDrawerTrigger` and `DropDrawerContent` inside it;
 *   every other DropDrawer part must render within this root.
 * - `presentation` picks the owner: the default `"responsive"` renders a desktop Base UI Menu and switches to a mobile
 *   Base UI Drawer while `(max-width: 767px)` matches. That query is `false` during server rendering and hydration, so
 *   the first render is always the desktop Menu and narrow viewports switch after hydration. Pass `"menu"` or
 *   `"drawer"` to force an owner (including on the server), or derive it from your own breakpoint with `useMediaQuery`.
 * - Switching owners while open (a breakpoint or `presentation` change) preserves openness, resets mobile submenu
 *   navigation and lets the new primitive establish focus; it is not an `onOpenChange` request. Real SDK requests remain
 *   cancellable.
 * - Name the mobile dialog with `mobileTitle` and localize the Back control with `backLabel`.
 *
 * @example
 * ```tsx
 * const narrow = useMediaQuery("(max-width: 1023px)");
 *
 * <DropDrawer presentation={narrow ? "drawer" : "menu"} mobileTitle='Document actions'>
 *   <DropDrawerTrigger render={<Button variant='outline' />}>Actions</DropDrawerTrigger>
 *   <DropDrawerContent aria-label='Document actions'>
 *     <DropDrawerItem onSelect={duplicate}>Duplicate</DropDrawerItem>
 *   </DropDrawerContent>
 * </DropDrawer>
 * ```
 */
function DropDrawer<Payload = unknown>({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  modal = true,
  mobileTitle = "Menu",
  backLabel = "Go back",
  menuProps,
  drawerProps,
  disabled = false,
  loopFocus,
  highlightItemOnHover,
  orientation,
  closeParentOnEsc,
  onItemHighlighted,
  disablePointerDismissal,
  swipeDirection,
  snapPoints,
  snapPoint,
  defaultSnapPoint,
  snapToSequentialPoints,
  onSnapPointChange,
  presentation,
  ...sharedProps
}: DropDrawerProps<Payload>): React.JSX.Element {
  const isMobile = useDrawerPresentation(presentation);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const handleOpenChange = (nextOpen: boolean, details: DropDrawerOpenChangeDetails): void => {
    onOpenChange?.(nextOpen, details);
    if (!details.isCanceled && controlledOpen === undefined) setUncontrolledOpen(nextOpen);
  };
  const context = React.useMemo(
    () => ({isMobile, open, disabled, mobileTitle, backLabel}),
    [isMobile, open, disabled, mobileTitle, backLabel],
  );

  return (
    <RootContext.Provider value={context}>
      {isMobile ? (
        <Drawer
          modal={modal}
          disablePointerDismissal={disablePointerDismissal}
          swipeDirection={swipeDirection}
          snapPoints={snapPoints}
          snapPoint={snapPoint}
          defaultSnapPoint={defaultSnapPoint}
          snapToSequentialPoints={snapToSequentialPoints}
          onSnapPointChange={onSnapPointChange}
          showSwipeHandle
          open={open}
          onOpenChange={handleOpenChange}
          {...sharedProps}
          {...drawerProps}>
          {children}
        </Drawer>
      ) : (
        <DropdownMenu
          modal={modal !== false}
          disabled={disabled}
          loopFocus={loopFocus}
          highlightItemOnHover={highlightItemOnHover}
          orientation={orientation}
          closeParentOnEsc={closeParentOnEsc}
          onItemHighlighted={onItemHighlighted}
          open={open}
          onOpenChange={handleOpenChange}
          {...sharedProps}
          {...menuProps}>
          {children}
        </DropdownMenu>
      )}
    </RootContext.Provider>
  );
}

/**
 * Opens the current primitive, preserving native/custom composition and merged refs.
 *
 * @remarks
 * - Client-only; render inside `DropDrawer`. Renders the Menu trigger on desktop and the Drawer trigger on mobile, a
 *   native `<button>` by default; set `nativeButton={false}` for non-button `render` targets.
 * - Branch-only options (such as detached `handle`s) go in `menuProps` or `drawerProps`. Disabled triggers swallow
 *   activation before any caller handler runs.
 *
 * @example
 * ```tsx
 * <DropDrawerTrigger render={<Button variant='ghost' size='icon' aria-label='More actions' />}>
 *   <MoreHorizontal aria-hidden='true' />
 * </DropDrawerTrigger>
 * ```
 */
const DropDrawerTrigger = ({
  ref,
  menuProps,
  drawerProps,
  children,
  render,
  disabled,
  ...props
}: Readonly<DropDrawerTriggerProps>): React.JSX.Element => {
  const root = useRoot();
  const controlRef = React.useRef<HTMLElement>(null);
  const mergedRef = useMergedRefs(ref, controlRef);
  const renderProp = render;
  const inlineBoundary =
    !React.isValidElement(renderProp)
    || typeof renderProp.type !== "string"
    || !/^(?:div|p|section|article|aside|nav|header|footer|main|form|fieldset|ul|ol|li|table|h[1-6])$/u.test(renderProp.type);
  const {delay, closeDelay, openOnHover, ...buttonProps} = props;
  const trigger = root.isMobile ? (
    <DrawerTrigger
      data-slot='drop-drawer-trigger'
      ref={mergedRef}
      disabled={root.disabled || disabled}
      nativeButton={props.nativeButton}
      render={children === undefined ? renderProp : withChildren(renderProp, children)}
      {...buttonProps}
      {...drawerProps}>
      {children}
    </DrawerTrigger>
  ) : (
    <DropdownMenuTrigger
      data-slot='drop-drawer-trigger'
      ref={mergedRef}
      render={render}
      disabled={root.disabled || disabled}
      {...props}
      {...menuProps}>
      {children}
    </DropdownMenuTrigger>
  );
  return (
    <ActivationBoundary
      inline={inlineBoundary}
      disabled={root.disabled || Boolean(disabled)}
      controlRef={controlRef}>
      {trigger}
    </ActivationBoundary>
  );
};

/**
 * Popup refs/events/render callbacks target the real role-bearing primitive in both branches.
 *
 * @remarks
 * - Client-only; render inside `DropDrawer`. Desktop renders a portaled `role="menu"` popup placed by the menu
 *   Positioner (`align="end"`, `sideOffset={4}` by default); mobile renders the Drawer `role="dialog"` popup and ignores
 *   placement props.
 * - `drawerProps` reaches only the mobile popup; `initialFocus` applies to the Drawer and `finalFocus` to both owners.
 * - Name the desktop menu with `aria-label`; the mobile dialog is named by its heading (`mobileTitle`, or the active
 *   submenu's title).
 * - Writes `dir="rtl"` on the desktop and mobile popups only under an RTL `DirectionProvider`; otherwise it writes no `dir`
 *   and they inherit the document direction, because Base UI's `useDirection()` also reports `"ltr"` without a provider.
 *   An explicit LTR provider inside an RTL document therefore needs `dir="ltr"` here; a caller's `dir` (or, on mobile,
 *   `drawerProps.dir`) always wins. Without an RTL `DirectionProvider`, Base UI keeps LTR submenu placement and arrow
 *   keys on desktop, so RTL apps should wrap in `DirectionProvider direction="rtl"`.
 *
 * @example
 * ```tsx
 * <DropDrawerContent aria-label='Document actions'>
 *   <DropDrawerGroup>
 *     <DropDrawerLabel>Document</DropDrawerLabel>
 *     <DropDrawerItem onSelect={archive}>Archive</DropDrawerItem>
 *   </DropDrawerGroup>
 * </DropDrawerContent>
 * ```
 */
const DropDrawerContent = ({ref, ...props}: Readonly<DropDrawerContentProps>): React.JSX.Element => {
  const root = useRoot();
  const {drawerProps, initialFocus, finalFocus, className, ...menuProps} = props;
  const mergedRef = useMergedRefs<HTMLElement>(ref);
  if (root.isMobile)
    return (
      <MobileContent
        ref={mergedRef}
        {...props}
      />
    );
  return (
    <DropdownMenuContent
      data-slot='drop-drawer-content'
      align='end'
      ref={mergedRef}
      finalFocus={finalFocus}
      className={(state) => cn(styles.desktopContent, typeof className === "function" ? className(state) : className)}
      {...menuProps}
    />
  );
};
/**
 * Action callbacks precede primitive closing; cancellation and disabled state suppress activation.
 *
 * @remarks
 * - Client-only; render inside `DropDrawerContent` (or a group/submenu). Desktop renders a `role="menuitem"`; mobile
 *   renders a native `<button>` that closes the Drawer unless `closeOnClick={false}`.
 * - `onClick` runs first, and its `preventDefault()` cancels both `onSelect` and closing. `onSelect` then receives the
 *   native event; its `preventDefault()` keeps the menu or drawer open. Disabled items run neither callback.
 * - `icon` renders a trailing decorative affordance; mark it `aria-hidden`.
 *
 * @example
 * ```tsx
 * <DropDrawerItem icon={<Copy aria-hidden='true' />} onSelect={duplicate}>
 *   Duplicate
 * </DropDrawerItem>
 * ```
 */
const DropDrawerItem = ({
  ref,
  children,
  render,
  className,
  disabled = false,
  closeOnClick = true,
  onClick,
  onSelect,
  onKeyDown,
  icon,
  inset,
  nativeButton,
  label,
  variant,
  ...props
}: Readonly<DropDrawerItemProps>): React.JSX.Element => {
  const root = useRoot();
  const controlRef = React.useRef<HTMLElement>(null);
  const mergedRef = useMergedRefs<HTMLElement>(ref, controlRef);
  const isDisabled = root.disabled || disabled;
  const renderProp = render;
  const content = (
    <>
      {contentOf(children, renderProp)}
      {icon ? <span className={styles.itemIcon}>{icon}</span> : null}
    </>
  );
  const handleClick: NonNullable<ResponsiveDOMEvents["onClick"]> = (event) => {
    if (isDisabled) {
      cancelActivation(event);
      return;
    }
    onClick?.(event);
    if (!isActivationCancelled(event)) onSelect?.(event.nativeEvent);
    if (isActivationCancelled(event)) cancelActivation(event);
  };
  const handleKeyDown: NonNullable<ResponsiveDOMEvents["onKeyDown"]> = (event) => {
    if (isDisabled) cancelActivation(event);
    else onKeyDown?.(event);
  };
  const Action = closeOnClick ? DrawerClose : BaseButton;
  const action = root.isMobile ? (
    <Action
      data-slot='drop-drawer-item'
      data-inset={inset}
      data-variant={variant}
      ref={mergedRef}
      disabled={isDisabled}
      nativeButton={
        nativeButton
        ?? (typeof renderProp === "object" && React.isValidElement(renderProp) && typeof renderProp.type === "string"
          ? renderProp.type === "button"
          : true)
      }
      render={withChildren(renderProp, content)}
      className={(state) => cn(styles.mobileItem, inset && styles.inset, typeof className === "function" ? className(state) : className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}>
      {content}
    </Action>
  ) : (
    <DropdownMenuItem
      data-slot='drop-drawer-item'
      ref={mergedRef}
      disabled={isDisabled}
      closeOnClick={closeOnClick}
      inset={inset}
      label={label}
      variant={variant}
      nativeButton={nativeButton}
      render={withChildren(renderProp, content)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
      {...props}>
      {content}
    </DropdownMenuItem>
  );
  return (
    <ActivationBoundary
      disabled={isDisabled}
      controlRef={controlRef}>
      {action}
    </ActivationBoundary>
  );
};
/**
 * A real desktop menu separator; mobile groups use CSS boundaries rather than menu roles.
 *
 * @remarks
 * - Client-only; render inside `DropDrawerContent`. Desktop renders a `role="separator"`; mobile renders nothing,
 *   because each `DropDrawerGroup` already draws its own boundary.
 *
 * @example
 * ```tsx
 * <DropDrawerContent aria-label='Account'>
 *   <DropDrawerItem onSelect={openProfile}>Profile</DropDrawerItem>
 *   <DropDrawerSeparator />
 *   <DropDrawerItem variant='destructive' onSelect={signOut}>Sign out</DropDrawerItem>
 * </DropDrawerContent>
 * ```
 */
const DropDrawerSeparator = ({ref, ...props}: Readonly<DropDrawerSeparatorProps>): React.JSX.Element | null => {
  return useRoot().isMobile ? null : (
    <DropdownMenuSeparator
      data-slot='drop-drawer-separator'
      ref={ref}
      {...props}
    />
  );
};
/**
 * Section labels use the group label owner and do not overwrite the mobile dialog title.
 *
 * @remarks
 * - Client-only; render inside `DropDrawerGroup`, before its items; it names the group in both owners. It never names
 *   the menu popup or the mobile dialog; use `aria-label` and `mobileTitle` for those.
 *
 * @example
 * ```tsx
 * <DropDrawerGroup>
 *   <DropDrawerLabel>Sharing</DropDrawerLabel>
 *   <DropDrawerItem onSelect={copyLink}>Copy link</DropDrawerItem>
 * </DropDrawerGroup>
 * ```
 */
const DropDrawerLabel = ({ref, className, ...props}: Readonly<DropDrawerLabelProps>): React.JSX.Element => {
  const root = useRoot();
  return (
    <DropdownMenuLabel
      data-slot='drop-drawer-label'
      ref={ref}
      className={(state) => cn(root.isMobile && styles.mobileLabel, typeof className === "function" ? className(state) : className)}
      {...props}
    />
  );
};
/**
 * Native footer layout with state-free render composition.
 *
 * @remarks
 * - Client-only; render inside `DropDrawerContent`. A plain `<div>` (or `render` target) laid out as a padded block on
 *   desktop and a stacked action area on mobile; it adds no role, so its items keep their own semantics.
 *
 * @example
 * ```tsx
 * <DropDrawerFooter>
 *   <DropDrawerItem closeOnClick={false} onSelect={openPreferences}>Preferences</DropDrawerItem>
 * </DropDrawerFooter>
 * ```
 */
const DropDrawerFooter = ({ref, className, render, ...props}: Readonly<DropDrawerFooterProps>): React.ReactElement => {
  const root = useRoot();
  return useRender<Record<string, never>, HTMLElement>({
    defaultTagName: "div",
    ref,
    props: {
      "data-slot": "drop-drawer-footer",
      className: cn(root.isMobile ? styles.mobileFooter : styles.desktopFooter, className),
      ...props,
    },
    render,
  });
};
/**
 * The real Group/GroupLabel relationship is valid for both menus and native action groups.
 *
 * @remarks
 * - Client-only; render inside `DropDrawerContent` or `DropDrawerSubContent`. Both owners render a `role="group"`
 *   named by its `DropDrawerLabel`; on mobile it also draws the rounded group surface.
 *
 * @example
 * ```tsx
 * <DropDrawerGroup>
 *   <DropDrawerLabel>Document</DropDrawerLabel>
 *   <DropDrawerItem onSelect={duplicate}>Duplicate</DropDrawerItem>
 *   <DropDrawerItem disabled>Delete (unavailable)</DropDrawerItem>
 * </DropDrawerGroup>
 * ```
 */
const DropDrawerGroup = ({ref, className, ...props}: Readonly<DropDrawerGroupProps>): React.JSX.Element => {
  const root = useRoot();
  return (
    <DropdownMenuGroup
      data-slot='drop-drawer-group'
      ref={ref}
      className={(state) => cn(root.isMobile && styles.mobileGroup, typeof className === "function" ? className(state) : className)}
      {...props}
    />
  );
};
/**
 * Maintains a stable submenu identity and live registration, including wrapped/nested children.
 *
 * @remarks
 * - Client-only; wrap one `DropDrawerSubTrigger` and one `DropDrawerSubContent`. Desktop renders a real Base UI
 *   submenu. On mobile the trigger drills down into a panel with a Back control; `onOpenChange` receives cancellable
 *   details whose destructured `cancel()`/`allowPropagation()` work as in Base UI.
 * - The mobile drill-down panel heading (the drawer dialog's name while the panel is active) follows `title`, else the
 *   trigger's `label`, else its visible text (excluding `aria-hidden` and `hidden` content), else the root `mobileTitle`.
 *
 * @example
 * ```tsx
 * <DropDrawerSub title='Paramètres'>
 *   <DropDrawerSubTrigger aria-label='Paramètres'><Settings aria-hidden='true' /></DropDrawerSubTrigger>
 *   <DropDrawerSubContent><DropDrawerItem>Langue</DropDrawerItem></DropDrawerSubContent>
 * </DropDrawerSub>
 * ```
 */
function DropDrawerSub({id, title, ...props}: DropDrawerSubProps): React.JSX.Element {
  const root = useRoot();
  const parent = React.useContext(SubContext);
  const navigation = React.useContext(NavigationContext);
  const generatedId = React.useId();
  const submenuId = id ?? generatedId;
  const optionsRef = React.useRef(props);
  const triggerRef = React.useRef<HTMLElement>(null);
  const panelRef = React.useRef<HTMLElement>(null);
  const [panelId, setPanelId] = React.useState(`${submenuId}-panel`);
  const [triggerText, setTriggerText] = React.useState("");
  const entry = React.useMemo(
    () => ({id: submenuId, parentId: parent?.id ?? null, triggerRef, panelRef, optionsRef}),
    [submenuId, parent?.id],
  );
  const context = React.useMemo(
    () => ({...entry, disabled: props.disabled ?? false, panelId, setPanelId, setTriggerText}),
    [entry, props.disabled, panelId],
  );
  const register = navigation?.register;
  const synchronize = navigation?.synchronize;
  const committedOpen = root.isMobile && root.open && Boolean(navigation?.path.includes(submenuId));
  React.useLayoutEffect(() => {
    optionsRef.current = props;
  });
  React.useLayoutEffect(() => {
    if (root.isMobile) return register?.(entry);
    return undefined;
  }, [entry, register, root.isMobile]);
  usePublishedPanelTitle(root.isMobile, submenuId, title?.trim() || triggerText, navigation?.setPanelTitle);
  React.useLayoutEffect(() => {
    if (root.isMobile && root.open && (props.open !== undefined || props.defaultOpen)) {
      synchronize?.(submenuId, props.open ?? Boolean(props.defaultOpen));
    }
  }, [props.open, props.defaultOpen, root.isMobile, root.open, submenuId, synchronize]);
  useSubmenuCompletion(root.isMobile, committedOpen, props.onOpenChangeComplete);
  return <SubContext.Provider value={context}>{root.isMobile ? props.children : <DropdownMenuSub {...props} />}</SubContext.Provider>;
}
/**
 * Disabled guards precede callbacks; enabled native buttons supply Enter/Space activation.
 *
 * @remarks
 * - Client-only; render inside `DropDrawerSub`. Desktop renders the menu `DropdownMenuSubTrigger`; mobile renders a
 *   native `<button>` with `aria-expanded`/`aria-controls` that opens the submenu panel unless `onClick` cancels it.
 * - Its trailing chevron is `aria-hidden`. On mobile it mirrors under `dir="rtl"` or an RTL `DirectionProvider`, like the
 *   Back control's; on desktop it mirrors only under an RTL `DirectionProvider`, where Base UI opens the submenu leftward.
 *
 * @example
 * ```tsx
 * <DropDrawerSub>
 *   <DropDrawerSubTrigger>Sharing</DropDrawerSubTrigger>
 *   <DropDrawerSubContent aria-label='Sharing actions'>
 *     <DropDrawerItem onSelect={copyLink}>Copy link</DropDrawerItem>
 *   </DropDrawerSubContent>
 * </DropDrawerSub>
 * ```
 */
const DropDrawerSubTrigger = ({
  ref,
  children,
  render,
  className,
  disabled = false,
  inset,
  onClick,
  onKeyDown,
  ...props
}: Readonly<DropDrawerSubTriggerProps>): React.JSX.Element => {
  const root = useRoot();
  const entry = useSubmenu();
  const navigation = React.useContext(NavigationContext);
  const direction = useDirection();
  const controlRef = React.useRef<HTMLElement>(null);
  const mergedRef = useMergedRefs(ref, entry.triggerRef, controlRef);
  const isDisabled = root.disabled || disabled || entry.disabled;
  const content = (
    <>
      {contentOf(children, render)}
      <ChevronRight
        aria-hidden='true'
        data-direction={direction}
        className={styles.chevron}
      />
    </>
  );
  const handleClick: NonNullable<ResponsiveDOMEvents["onClick"]> = (event) => {
    if (isDisabled) {
      cancelActivation(event);
      return;
    }
    onClick?.(event);
    if (isActivationCancelled(event)) {
      cancelActivation(event);
      return;
    }
    if (root.isMobile) navigation?.navigate(entry.id, event.nativeEvent);
  };
  const handleKeyDown: NonNullable<ResponsiveDOMEvents["onKeyDown"]> = (event) => {
    if (isDisabled) cancelActivation(event);
    else onKeyDown?.(event);
  };
  const {delay, closeDelay, openOnHover, label, ...buttonProps} = props;
  useTriggerText(root.isMobile, controlRef, label, entry.setTriggerText);
  const trigger = root.isMobile ? (
    <BaseButton
      data-slot='drop-drawer-sub-trigger'
      ref={mergedRef}
      disabled={isDisabled}
      aria-controls={entry.panelId}
      aria-expanded={navigation?.activeId === entry.id}
      render={withChildren(render, content)}
      className={(state) => cn(styles.mobileItem, inset && styles.inset, typeof className === "function" ? className(state) : className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...buttonProps}>
      {content}
    </BaseButton>
  ) : (
    <DropdownMenuSubTrigger
      data-slot='drop-drawer-sub-trigger'
      ref={mergedRef}
      disabled={isDisabled}
      inset={inset}
      className={className}
      render={render}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}>
      {children}
    </DropdownMenuSubTrigger>
  );
  return (
    <ActivationBoundary
      disabled={isDisabled}
      controlRef={controlRef}>
      {trigger}
    </ActivationBoundary>
  );
};

/**
 * Desktop uses a real SDK submenu popup; mobile uses the local panel owner with precise open state.
 *
 * @remarks
 * - Client-only; render inside `DropDrawerSub` after its trigger. Desktop accepts every `DropdownMenuSubContent` prop
 *   and default (`side="inline-end"`, `alignOffset={-3}`); mobile ignores placement and renders a live panel that
 *   stays mounted, so its state and registered descendants persist while other panels are shown.
 * - `className`, `style` and `render` callbacks receive the desktop popup state or the mobile `{open}` panel state.
 *
 * @example
 * ```tsx
 * <DropDrawerSubContent aria-label='Permissions'>
 *   <DropDrawerItem onSelect={grantReadOnly}>Read-only access</DropDrawerItem>
 * </DropDrawerSubContent>
 * ```
 */
const DropDrawerSubContent = ({ref, ...props}: Readonly<DropDrawerSubContentProps>): React.JSX.Element | null => {
  const root = useRoot();
  const entry = useSubmenu();
  const mergedRef = useMergedRefs<HTMLElement>(ref, entry.panelRef);
  if (root.isMobile)
    return (
      <MobileSubContent
        ref={mergedRef}
        {...props}
      />
    );
  return (
    <DropdownMenuSubContent
      data-slot='drop-drawer-sub-content'
      ref={mergedRef}
      {...props}
    />
  );
};

DropDrawer.displayName = "DropDrawer";
DropDrawerTrigger.displayName = "DropDrawerTrigger";
DropDrawerContent.displayName = "DropDrawerContent";
DropDrawerItem.displayName = "DropDrawerItem";
DropDrawerSeparator.displayName = "DropDrawerSeparator";
DropDrawerLabel.displayName = "DropDrawerLabel";
DropDrawerFooter.displayName = "DropDrawerFooter";
DropDrawerGroup.displayName = "DropDrawerGroup";
DropDrawerSub.displayName = "DropDrawerSub";
DropDrawerSubTrigger.displayName = "DropDrawerSubTrigger";
DropDrawerSubContent.displayName = "DropDrawerSubContent";

export {
  DropDrawer,
  DropDrawerContent,
  DropDrawerFooter,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerLabel,
  DropDrawerSeparator,
  DropDrawerSub,
  DropDrawerSubContent,
  DropDrawerSubTrigger,
  DropDrawerTrigger,
};
