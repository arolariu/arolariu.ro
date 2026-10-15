"use client";

import {Button as BaseButton} from "@base-ui/react/button";
import type {Drawer as BaseDrawer} from "@base-ui/react/drawer";
import type {Menu as BaseMenu} from "@base-ui/react/menu";
import type {BaseUIEvent, ComponentRenderFn, HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import {ChevronLeft, ChevronRight} from "lucide-react";
import * as React from "react";
import {useSubmenuCompletion} from "./_dropdrawer";
import {createPortal} from "react-dom";

import {useIsMobile} from "@/hooks/useIsMobile";
import {useMergedRefs} from "@/hooks/useMergedRefs";
import {useMobilePanelFocusRecovery} from "@/lib/_focus-availability";
import {cn} from "@/lib/utilities";
import {Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger} from "./drawer";
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
      /** Cancellable SDK requests; a breakpoint change is not an open-change request. */
      onOpenChange?: (open: boolean, details: DropDrawerOpenChangeDetails) => void;
      /** Desktop-only SDK options, including detached handles. Shared open state takes precedence. */
      menuProps?: Readonly<Omit<BaseMenu.Root.Props<Payload>, "children" | "open" | "defaultOpen" | "onOpenChange">>;
      /** Mobile-only SDK options. Shared open state takes precedence. */
      drawerProps?: Readonly<Omit<BaseDrawer.Root.Props<Payload>, "children" | "open" | "defaultOpen" | "onOpenChange">>;
      /** Accessible mobile root panel title. @default "Menu" */
      mobileTitle?: string;
      /** Accessible mobile back control label. @default "Go back" */
      backLabel?: string;
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
  Omit<DropdownMenuContentProps, "ref" | "render" | "className" | "style">
    & Pick<BaseDrawer.Popup.Props, "initialFocus"> & {
      ref?: React.Ref<HTMLElement>;
      render?: RenderProp<DropDrawerContentState>;
      className?: StateClassName<DropDrawerContentState>;
      /** State-aware caller styling is resolved by the actual SDK popup. */
      style?: React.CSSProperties | ((state: DropDrawerContentState) => React.CSSProperties | undefined);
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
export type DropDrawerSubProps = Readonly<BaseMenu.SubmenuRoot.Props & {id?: string}>;
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
/** Desktop positioning plus state-aware composition of the live mobile panel. */
export type DropDrawerSubContentProps = Readonly<
  Omit<DropdownMenuContentProps, "ref" | "render" | "className" | "style"> & {
    ref?: React.Ref<HTMLElement>;
    render?: RenderProp<DropDrawerSubContentState>;
    className?: StateClassName<DropDrawerSubContentState>;
    style?: React.CSSProperties | ((state: DropDrawerSubContentState) => React.CSSProperties | undefined);
  }
>;
interface RootContextValue {
  readonly isMobile: boolean;
  readonly open: boolean;
  readonly disabled: boolean;
  readonly mobileTitle: string;
  readonly backLabel: string;
}
const RootContext = React.createContext<RootContextValue | null>(null);
function useRoot(): RootContextValue {
  const value = React.useContext(RootContext);
  if (!value) throw new Error("DropDrawer components must be rendered within DropDrawer.");
  return value;
}
interface SubmenuRegistration {
  readonly id: string;
  readonly parentId: string | null;
  readonly triggerRef: React.RefObject<HTMLElement | null>;
  readonly panelRef: React.RefObject<HTMLElement | null>;
  readonly optionsRef: React.RefObject<DropDrawerSubProps>;
}
function getLivePath(id: string, entries: ReadonlyMap<string, SubmenuRegistration>): readonly string[] | null {
  const path: string[] = [];
  let entry = entries.get(id);
  while (entry) {
    if (!entry.panelRef.current?.isConnected || entry.optionsRef.current.open === false) return null;
    if (path.includes(entry.id)) throw new Error(`Duplicate DropDrawerSub id: ${entry.id}`);
    path.unshift(entry.id);
    if (entry.parentId === null) return path;
    entry = entries.get(entry.parentId);
  }
  return null;
}
interface NavigationContextValue {
  readonly activeId: string | null;
  readonly path: readonly string[];
  readonly panelHost: HTMLDivElement | null;
  readonly register: (entry: SubmenuRegistration) => () => void;
  readonly navigate: (id: string, event: MouseEvent) => void;
  readonly synchronize: (id: string, open: boolean) => void;
  readonly panelAvailabilityChanged: (id: string) => void;
}
const NavigationContext = React.createContext<NavigationContextValue | null>(null);
type SubmenuContextValue = SubmenuRegistration & {
  readonly disabled: boolean;
  readonly panelId: string;
  readonly setPanelId: (id: string) => void;
};
const SubContext = React.createContext<SubmenuContextValue | null>(null);
function useNavigation(): NavigationContextValue {
  const value = React.useContext(NavigationContext);
  if (!value) throw new Error("Mobile DropDrawer submenus must be rendered within DropDrawerContent.");
  return value;
}
function useSubmenu(): SubmenuContextValue {
  const value = React.useContext(SubContext);
  if (!value) throw new Error("DropDrawerSubTrigger and DropDrawerSubContent require DropDrawerSub.");
  return value;
}
function withChildren<State>(render: RenderProp<State> | undefined, children: React.ReactNode): RenderProp<State> | undefined {
  const element = elementOf(render);
  // eslint-disable-next-line react-x/no-clone-element -- only supply compound children; SDK retains render state, handlers and refs.
  return element ? React.cloneElement(element, {children}) : render;
}
function contentOf<State>(children: React.ReactNode, render: RenderProp<State> | undefined): React.ReactNode {
  return children === undefined ? elementOf(render)?.props.children : children;
}
function elementOf<State>(
  render: RenderProp<State> | undefined,
): React.ReactElement<{children?: React.ReactNode; id?: string}> | undefined {
  if (render === undefined || typeof render === "function") return undefined;
  // eslint-disable-next-line react-x/no-children-to-array -- only mounted render owners resolve opaque slots through public React normalization.
  const [element] = React.Children.toArray(render);
  return React.isValidElement<{children?: React.ReactNode; id?: string}>(element) ? element : undefined;
}
/** A closed Drawer portal must not resolve the mobile popup's pending element children. */
function MobileElementChildren({
  children,
  render,
}: Readonly<{children: React.ReactNode; render: BaseDrawer.Popup.Props["render"]}>): React.ReactElement {
  return <>{contentOf(children, render)}</>;
}
function cancelActivation(event: React.SyntheticEvent): void {
  event.preventDefault();
  if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") event.preventBaseUIHandler();
}
function isActivationCancelled(event: React.SyntheticEvent): boolean {
  return (
    event.defaultPrevented
    || event.nativeEvent.defaultPrevented
    || ("baseUIHandlerPrevented" in event && event.baseUIHandlerPrevented === true)
  );
}
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
/** Mobile panels stay mounted; preventing their unmount is already guaranteed by that owner. */
function requestSubmenuChange(entry: SubmenuRegistration, open: boolean, event: MouseEvent): boolean {
  const details: BaseMenu.SubmenuRoot.ChangeEventDetails = {
    reason: open ? "trigger-press" : "close-press",
    event,
    trigger: entry.triggerRef.current ?? undefined,
    isCanceled: false,
    isPropagationAllowed: false,
    cancel() {
      this.isCanceled = true;
    },
    allowPropagation() {
      this.isPropagationAllowed = true;
    },
    preventUnmountOnClose() {
      // Local panels are retained until the enclosing Drawer unmounts.
    },
  };
  entry.optionsRef.current.onOpenChange?.(open, details);
  return !details.isCanceled && (entry.optionsRef.current.open === undefined || entry.optionsRef.current.open === open);
}

/**
 * Responsive SDK Menu/Drawer root with one controlled or uncontrolled open contract.
 * Breakpoint migration preserves openness, resets submenu navigation and lets the new
 * primitive establish focus. Real SDK requests remain cancellable.
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
  ...sharedProps
}: DropDrawerProps<Payload>): React.JSX.Element {
  const isMobile = useIsMobile();
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

/** Opens the current primitive, preserving native/custom composition and merged refs. */
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

/** Live mobile navigation: register actual nodes, never copied/cached React children. */
const MobileContent = ({
  ref,
  children,
  className,
  render,
  drawerProps,
  initialFocus,
  finalFocus,
  ...props
}: Readonly<DropDrawerContentProps>): React.JSX.Element => {
  const root = useRoot();
  const popupRender = drawerProps?.render ?? render;
  const {className: drawerClassName, ...drawerPopupProps} = drawerProps ?? {};
  const [path, setPath] = React.useState<readonly string[]>([]);
  const [previousOpen, setPreviousOpen] = React.useState(root.open);
  // Reset navigation on the state transition without remounting the SDK popup or delaying reset until an effect.
  if (previousOpen !== root.open) {
    setPreviousOpen(root.open);
    if (!root.open) setPath([]);
  }
  const [panelHost, setPanelHost] = React.useState<HTMLDivElement | null>(null);
  const mainRef = React.useRef<HTMLDivElement>(null);
  const entriesRef = React.useRef(new Map<string, SubmenuRegistration>());
  const openingRequestsRef = React.useRef(new Set<string>());
  const pendingFocusRef = React.useRef<"entry" | HTMLElement | null>(null);
  const activeId = useMobilePanelFocusRecovery(root.open, path, mainRef, entriesRef, pendingFocusRef);
  const active = activeId === null ? undefined : entriesRef.current.get(activeId);
  const closePath = React.useCallback((id: string): void => {
    setPath((previous) => {
      const index = previous.indexOf(id);
      if (index === -1) return previous;
      pendingFocusRef.current = entriesRef.current.get(id)?.triggerRef.current ?? "entry";
      return previous.slice(0, index);
    });
  }, []);
  const activateRequestedPath = React.useCallback((): void => {
    if (!root.open) return;
    let candidate: readonly string[] = [];
    for (const requestedId of openingRequestsRef.current) {
      const livePath = getLivePath(requestedId, entriesRef.current);
      if (livePath && livePath.length >= candidate.length) candidate = livePath;
    }
    if (candidate.length === 0) return;
    setPath((previous) => {
      if (previous.length === candidate.length && previous.every((value, index) => value === candidate[index])) return previous;
      pendingFocusRef.current = "entry";
      return candidate;
    });
  }, [root.open]);
  const synchronize = React.useCallback(
    (id: string, nextOpen: boolean): void => {
      if (!nextOpen) {
        openingRequestsRef.current.delete(id);
        for (const requestedId of openingRequestsRef.current) {
          let ancestorId = entriesRef.current.get(requestedId)?.parentId;
          while (ancestorId !== null && ancestorId !== undefined) {
            if (ancestorId === id) {
              openingRequestsRef.current.delete(requestedId);
              break;
            }
            ancestorId = entriesRef.current.get(ancestorId)?.parentId;
          }
        }
        closePath(id);
        return;
      }
      openingRequestsRef.current.delete(id);
      openingRequestsRef.current.add(id);
      activateRequestedPath();
    },
    [activateRequestedPath, closePath],
  );
  const panelAvailabilityChanged = React.useCallback(
    (id: string): void => {
      if (!entriesRef.current.get(id)?.panelRef.current?.isConnected) closePath(id);
      activateRequestedPath();
    },
    [activateRequestedPath, closePath],
  );
  const register = React.useCallback(
    (entry: SubmenuRegistration): (() => void) => {
      const registered = entriesRef.current.get(entry.id);
      if (registered && registered !== entry) throw new Error(`Duplicate DropDrawerSub id: ${entry.id}`);
      entriesRef.current.set(entry.id, entry);
      activateRequestedPath();
      return () => {
        if (entriesRef.current.get(entry.id) !== entry) return;
        closePath(entry.id);
        entriesRef.current.delete(entry.id);
        openingRequestsRef.current.delete(entry.id);
      };
    },
    [activateRequestedPath, closePath],
  );
  React.useLayoutEffect(() => {
    if (!root.open) openingRequestsRef.current.clear();
  }, [root.open]);
  const navigate = React.useCallback(
    (id: string, event: MouseEvent): void => {
      const entry = entriesRef.current.get(id);
      if (!entry?.panelRef.current?.isConnected || entry.optionsRef.current.disabled || !requestSubmenuChange(entry, true, event)) return;
      synchronize(id, true);
    },
    [synchronize],
  );
  const goBack = (event: React.MouseEvent<HTMLButtonElement>): void => {
    if (!active || !requestSubmenuChange(active, false, event.nativeEvent)) return;
    synchronize(active.id, false);
  };
  const navigation = React.useMemo(
    () => ({activeId, path, panelHost, register, navigate, synchronize, panelAvailabilityChanged}),
    [activeId, path, panelHost, register, navigate, synchronize, panelAvailabilityChanged],
  );
  const {
    align,
    alignOffset,
    side,
    sideOffset,
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
    ...popupProps
  } = props;

  return (
    <NavigationContext.Provider value={navigation}>
      <DrawerContent
        data-slot='drop-drawer-content'
        ref={ref}
        initialFocus={drawerProps?.initialFocus ?? initialFocus}
        finalFocus={drawerProps?.finalFocus ?? finalFocus}
        render={popupRender}
        className={(state) =>
          cn(
            styles.mobileContent,
            typeof className === "function" ? className(state) : className,
            typeof drawerClassName === "function" ? drawerClassName(state) : drawerClassName,
          )
        }
        {...popupProps}
        {...drawerPopupProps}>
        <div className={cn(styles.mobileHeader, activeId === null && styles.screenReaderOnlyHeader)}>
          {activeId !== null && (
            <button
              type='button'
              aria-label={root.backLabel}
              className={styles.backButton}
              onClick={goBack}>
              <ChevronLeft
                aria-hidden='true'
                className={styles.chevron}
              />
            </button>
          )}
          <DrawerTitle>{active?.triggerRef.current?.textContent || root.mobileTitle}</DrawerTitle>
        </div>
        <div
          ref={mainRef}
          hidden={activeId !== null}
          tabIndex={-1}
          className={styles.mobilePanel}>
          <MobileElementChildren render={popupRender}>{children}</MobileElementChildren>
        </div>
        <div
          ref={setPanelHost}
          className={styles.mobilePanelHost}
        />
      </DrawerContent>
    </NavigationContext.Provider>
  );
};
MobileContent.displayName = "DropDrawerMobileContent";
/** Popup refs/events/render callbacks target the real role-bearing primitive in both branches. */
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
/** Action callbacks precede primitive closing; cancellation and disabled state suppress activation. */
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
/** A real desktop menu separator; mobile groups use CSS boundaries rather than menu roles. */
const DropDrawerSeparator = ({ref, ...props}: Readonly<DropDrawerSeparatorProps>): React.JSX.Element | null => {
  return useRoot().isMobile ? null : (
    <DropdownMenuSeparator
      data-slot='drop-drawer-separator'
      ref={ref}
      {...props}
    />
  );
};
/** Section labels use the group label owner and do not overwrite the mobile dialog title. */
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
/** Native footer layout with state-free render composition. */
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
/** The real Group/GroupLabel relationship is valid for both menus and native action groups. */
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
/** Maintains a stable submenu identity and live registration, including wrapped/nested children. */
function DropDrawerSub({id, ...props}: DropDrawerSubProps): React.JSX.Element {
  const root = useRoot();
  const parent = React.useContext(SubContext);
  const navigation = React.useContext(NavigationContext);
  const generatedId = React.useId();
  const submenuId = id ?? generatedId;
  const optionsRef = React.useRef(props);
  const triggerRef = React.useRef<HTMLElement>(null);
  const panelRef = React.useRef<HTMLElement>(null);
  const [panelId, setPanelId] = React.useState(`${submenuId}-panel`);
  const entry = React.useMemo(
    () => ({id: submenuId, parentId: parent?.id ?? null, triggerRef, panelRef, optionsRef}),
    [submenuId, parent?.id],
  );
  const context = React.useMemo(
    () => ({...entry, disabled: props.disabled ?? false, panelId, setPanelId}),
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
  React.useLayoutEffect(() => {
    if (root.isMobile && root.open && (props.open !== undefined || props.defaultOpen)) {
      synchronize?.(submenuId, props.open ?? Boolean(props.defaultOpen));
    }
  }, [props.open, props.defaultOpen, root.isMobile, root.open, submenuId, synchronize]);
  useSubmenuCompletion(root.isMobile, committedOpen, props.onOpenChangeComplete);
  return <SubContext.Provider value={context}>{root.isMobile ? props.children : <DropdownMenuSub {...props} />}</SubContext.Provider>;
}
/** Disabled guards precede callbacks; enabled native buttons supply Enter/Space activation. */
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
  const controlRef = React.useRef<HTMLElement>(null);
  const mergedRef = useMergedRefs(ref, entry.triggerRef, controlRef);
  const isDisabled = root.disabled || disabled || entry.disabled;
  const content = (
    <>
      {contentOf(children, render)}
      <ChevronRight
        aria-hidden='true'
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

/** Keeps mobile panel descendants mounted in a portal, so registration and child updates remain live. */
const MobileSubContent = ({
  ref,
  children,
  className,
  render,
  id,
  ...props
}: Readonly<DropDrawerSubContentProps>): React.ReactElement | null => {
  const entry = useSubmenu();
  const navigation = useNavigation();
  const {panelAvailabilityChanged} = navigation;
  const notifyPanelRef = React.useCallback(() => panelAvailabilityChanged(entry.id), [entry.id, panelAvailabilityChanged]);
  const mergedRef = useMergedRefs(ref, entry.panelRef, notifyPanelRef);
  const open = navigation.activeId === entry.id;
  const renderElement = elementOf(render);
  const panelId = renderElement?.props.id ?? id ?? `${entry.id}-panel`;
  const {setPanelId} = entry;
  React.useLayoutEffect(() => {
    setPanelId(panelId);
  }, [panelId, setPanelId]);
  const {
    align,
    alignOffset,
    side,
    sideOffset,
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
    finalFocus,
    style,
    ...panelProps
  } = props;
  const panel = useRender<DropDrawerPanelState, HTMLElement>({
    defaultTagName: "div",
    ref: mergedRef,
    render: withChildren(render, contentOf(children, render)),
    state: {open},
    props: {
      "data-slot": "drop-drawer-sub-content",
      id: panelId,
      hidden: !open,
      tabIndex: -1,
      className: cn(styles.mobilePanel, typeof className === "function" ? className({open}) : className),
      style: typeof style === "function" ? style({open}) : style,
      children: contentOf(children, render),
      ...panelProps,
    },
  });
  return navigation.panelHost ? createPortal(panel, navigation.panelHost) : null;
};
MobileSubContent.displayName = "DropDrawerMobileSubContent";
/** Desktop uses a real SDK submenu popup; mobile uses the local panel owner with precise open state. */
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
