"use client";

import {Drawer as BaseDrawer, DrawerPopupCssVariables} from "@base-ui/react/drawer";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {useEventCallback} from "@/hooks/useEventCallback";
import {useMergedRefs} from "@/hooks/useMergedRefs";
import {cn} from "@/lib/utilities";
import styles from "./drawer.module.css";

/** Base UI owns open state, payloads, snap points, gestures, modality and nesting. */
export type DrawerProps<Payload = unknown> = Readonly<
  BaseDrawer.Root.Props<Payload> & {
    /** Add a decorative pointer-drag surface outside Drawer.Content. @default false */
    showSwipeHandle?: boolean;
  }
>;
/** Trigger props retain Base UI's render, class callback and native button contracts. */
export type DrawerTriggerProps = Readonly<Omit<BaseDrawer.Trigger.Props, "ref"> & {ref?: React.Ref<HTMLElement>}>;
/** Portal configuration for custom primitive compositions. */
export type DrawerPortalProps = Readonly<BaseDrawer.Portal.Props>;
/** Base UI close control, without imposed button presentation. */
export type DrawerCloseProps = Readonly<React.ComponentPropsWithRef<typeof BaseDrawer.Close>>;
/** Backdrop composition with a ref to the actual rendered element. */
export type DrawerOverlayProps = Readonly<Omit<BaseDrawer.Backdrop.Props, "ref"> & {ref?: React.Ref<HTMLElement>}>;
/** Popup composition, including Base UI's initial/final focus contracts. */
export type DrawerContentProps = Readonly<
  Omit<BaseDrawer.Popup.Props, "ref"> & {
    ref?: React.Ref<HTMLElement>;
    /**
     * Props for the internal Portal, for example `keepMounted` (keep the closed drawer and its form state mounted
     * but hidden) or `container` (portal into a theme-scoped element, shadow root or another document). Content
     * always supplies the portal's children.
     */
    portalProps?: Readonly<Omit<DrawerPortalProps, "children">>;
  }
>;
/** Decorative swipe surface; its gestures are owned by the enclosing Viewport. */
export type DrawerSwipeHandleProps = Readonly<
  Omit<useRender.ComponentProps<"div", Record<string, never>>, "ref"> & {ref?: React.Ref<HTMLElement>}
>;
/** Layout composition using the native render contract. */
export type DrawerHeaderProps = Readonly<DrawerSwipeHandleProps>;
/** Action layout with the same composition contract as DrawerHeader. */
// eslint-disable-next-line sonarjs/redundant-type-aliases -- retain the independent public footer prop name.
export type DrawerFooterProps = DrawerHeaderProps;
/** Accessible title props with a ref to the actual rendered heading. */
export type DrawerTitleProps = Readonly<Omit<BaseDrawer.Title.Props, "ref"> & {ref?: React.Ref<HTMLElement>}>;
/** Accessible description props with a ref to the actual rendered element. */
export type DrawerDescriptionProps = Readonly<Omit<BaseDrawer.Description.Props, "ref"> & {ref?: React.Ref<HTMLElement>}>;

type DrawerSnapPoint = BaseDrawer.Root.SnapPoint;
type DrawerSnapPointChangeDetails = BaseDrawer.Root.SnapPointChangeEventDetails;

interface DrawerPresentation {
  readonly hasSnapPoints: boolean;
  readonly modal: NonNullable<BaseDrawer.Root.Props["modal"]>;
  readonly showSwipeHandle: boolean;
  readonly swipeDirection: NonNullable<BaseDrawer.Root.Props["swipeDirection"]>;
  /** Stable request to reveal a focused popup descendant hidden by a partial snap point. */
  readonly revealFocusedElement: (popup: HTMLElement, target: Element, event: FocusEvent) => void;
}

const DrawerPresentationContext = React.createContext<DrawerPresentation | null>(null);

function useDrawerPresentation(): DrawerPresentation {
  const context = React.useContext(DrawerPresentationContext);
  if (!context) throw new Error("DrawerContent must be used within Drawer.");
  return context;
}

/** Mirrors Base UI's uncontrolled resolution so wrapper-owned snap state renders exactly as the primitive's did. */
function resolveUncontrolledSnapPoint(
  value: DrawerSnapPoint | null,
  snapPoints: readonly DrawerSnapPoint[] | undefined,
  defaultSnapPoint: DrawerSnapPoint | null | undefined,
): DrawerSnapPoint | null {
  if (!snapPoints?.length || (value !== null && snapPoints.some((point) => Object.is(point, value)))) return value;
  return defaultSnapPoint === undefined ? (snapPoints[0] ?? null) : defaultSnapPoint;
}

/** Resolves a snap point with Base UI's documented units: viewport fractions up to 1, otherwise px or rem. */
function snapPointHeight(snapPoint: DrawerSnapPoint, viewportHeight: number, rootFontSize: number): number | null {
  if (typeof snapPoint === "number") {
    if (!Number.isFinite(snapPoint)) return null;
    return snapPoint <= 1 ? Math.min(Math.max(snapPoint, 0), 1) * viewportHeight : snapPoint;
  }
  const value = Number.parseFloat(snapPoint);
  const unit = snapPoint.trim();
  if (!Number.isFinite(value)) return null;
  if (unit.endsWith("px")) return value;
  return unit.endsWith("rem") ? value * rootFontSize : null;
}

/** The tallest supplied snap point, measured against the popup's own viewport and document. */
function largestSnapPoint(snapPoints: readonly DrawerSnapPoint[], popup: HTMLElement): DrawerSnapPoint | null {
  const {documentElement, defaultView} = popup.ownerDocument;
  const viewportHeight = popup.parentElement?.offsetHeight || documentElement.clientHeight;
  const rootFontSize = Number.parseFloat(defaultView?.getComputedStyle(documentElement).fontSize ?? "") || 16;
  let largestValue: DrawerSnapPoint | null = null;
  let largestHeight = Number.NEGATIVE_INFINITY;
  for (const value of snapPoints) {
    const height = snapPointHeight(value, viewportHeight, rootFontSize);
    if (height !== null && height > largestHeight) {
      largestValue = value;
      largestHeight = height;
    }
  }
  return largestValue;
}

/**
 * Whether any part of `target` lies in the band a partial snap point translates off-screen. Geometry is relative
 * to the popup, so enter/exit transforms and swipe movement never count as hidden.
 */
function isBeyondVisibleSnapHeight(popup: HTMLElement, target: Element): boolean {
  const offset = Number.parseFloat(popup.style.getPropertyValue(DrawerPopupCssVariables.snapPointOffset));
  if (!Number.isFinite(offset) || offset === 0) return false;
  const popupRect = popup.getBoundingClientRect();
  if (popupRect.height <= 0) return false;
  const targetRect = target.getBoundingClientRect();
  // Downward drawers translate their bottom band away; upward drawers (negative offsets) hide their top band.
  return offset > 0 ? targetRect.bottom - popupRect.top > popupRect.height - offset : targetRect.top - popupRect.top < -offset;
}

/** Base UI-shaped details for a library-initiated snap request; owners can cancel it like any other request. */
function createSnapPointChangeDetails(event: Event): DrawerSnapPointChangeDetails {
  let canceled = false;
  let propagationAllowed = false;
  return {
    reason: "none",
    event,
    trigger: undefined,
    cancel: () => {
      canceled = true;
    },
    allowPropagation: () => {
      propagationAllowed = true;
    },
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
  };
}

function isNodeTarget(target: EventTarget | null): target is Node {
  return target !== null && "nodeType" in target && typeof target.nodeType === "number";
}

/** Realm-independent element check: portaled popups may live in another document. */
function isElementTarget(target: EventTarget | null): target is Element {
  return isNodeTarget(target) && target.nodeType === 1;
}

/**
 * Listens on the popup's own DOM (so nested, separately portaled drawers never report into a parent) and asks the
 * root to reveal focused descendants. Focus produced by pressing that control is left alone: the pointer proves the
 * control is visible, and moving it mid-press could retarget the click.
 */
function useSnapFocusReveal(reveal: DrawerPresentation["revealFocusedElement"]): React.RefCallback<HTMLElement> {
  return React.useCallback(
    (popup: HTMLElement | null) => {
      if (!popup) return undefined;
      let pressed: Node | null = null;
      const recordPress = (event: PointerEvent): void => {
        pressed = isNodeTarget(event.target) ? event.target : null;
      };
      const clearPress = (): void => {
        pressed = null;
      };
      const revealFocus = (event: FocusEvent): void => {
        const press = pressed;
        pressed = null;
        const {target} = event;
        if (!isElementTarget(target) || target === popup || (press !== null && target.contains(press))) return;
        reveal(popup, target, event);
      };
      popup.addEventListener("pointerdown", recordPress, {capture: true});
      popup.addEventListener("keydown", clearPress, {capture: true});
      popup.addEventListener("focusin", revealFocus);
      return () => {
        popup.removeEventListener("pointerdown", recordPress, {capture: true});
        popup.removeEventListener("keydown", clearPress, {capture: true});
        popup.removeEventListener("focusin", revealFocus);
      };
    },
    [reveal],
  );
}

// Base UI merges this callback with its own ref; do not narrow composed elements to the default tag.
function useDrawerElementRef(ref: React.Ref<HTMLElement> | undefined): React.RefCallback<HTMLElement> {
  return React.useCallback(
    (element) => {
      if (typeof ref === "function") return ref(element);
      if (ref) ref.current = element;
      return undefined;
    },
    [ref],
  );
}

/**
 * Coordinates drawer state and accessibility behavior.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Preserves the underlying primitive API for advanced composition
 * - Base UI owns open state, gestures and snap-point resolution; supplied snap points are passed through unchanged
 * - Handles are opt-in with `showSwipeHandle`
 * - With vertical `snapPoints`, when keyboard or programmatic focus lands on a control that the active snap point
 *   keeps (even partly) off-screen, Drawer requests its largest supplied snap point with `reason: "none"`.
 *   Uncontrolled drawers expand; controlled drawers receive the request through `onSnapPointChange` and must apply
 *   it (or cancel it and reveal the control another way). Focus produced by pressing the control never moves it.
 * - Supply a snap point tall enough to show every focusable control (for example `1`), or keep focusable controls
 *   within the smallest snap height; focus cannot be revealed beyond the largest snap point.
 * - `modal` defaults to `true`. Modal and `"trap-focus"` drawers keep focus inside the popup, so always place a
 *   reachable close control, such as {@link DrawerClose}, inside {@link DrawerContent}: touch screen-reader users cannot
 *   press Escape, and the swipe gesture is not available to them.
 *
 * @example
 * ```tsx
 * <Drawer
 *   showSwipeHandle
 *   snapPoints={[0.35, 1]}>
 *   <DrawerTrigger>Open details</DrawerTrigger>
 *   <DrawerContent>
 *     <DrawerTitle>Details</DrawerTitle>
 *     <DrawerClose>Close</DrawerClose>
 *   </DrawerContent>
 * </Drawer>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
function Drawer<Payload = unknown>({
  modal = true,
  showSwipeHandle = false,
  snapPoints,
  snapPoint,
  defaultSnapPoint,
  onSnapPointChange,
  swipeDirection = "down",
  ...props
}: Readonly<Drawer.Props<Payload>>): React.ReactElement {
  const hasSnapPoints = Boolean(snapPoints?.length);
  // The wrapper owns uncontrolled snap state so it can request a snap point; Base UI resolves it unchanged.
  const [uncontrolledSnapPoint, setUncontrolledSnapPoint] = React.useState<DrawerSnapPoint | null>(() =>
    defaultSnapPoint === undefined ? (snapPoints?.[0] ?? null) : defaultSnapPoint,
  );
  const activeSnapPoint =
    snapPoint === undefined ? resolveUncontrolledSnapPoint(uncontrolledSnapPoint, snapPoints, defaultSnapPoint) : snapPoint;
  const handleSnapPointChange = (value: DrawerSnapPoint | null, details: DrawerSnapPointChangeDetails): void => {
    onSnapPointChange?.(value, details);
    if (!details.isCanceled && snapPoint === undefined) setUncontrolledSnapPoint(value);
  };
  const revealFocusedElement = useEventCallback((popup: HTMLElement, target: Element, event: FocusEvent): void => {
    if (!snapPoints?.length || !isBeyondVisibleSnapHeight(popup, target)) return;
    const largest = largestSnapPoint(snapPoints, popup);
    if (largest === null || Object.is(largest, activeSnapPoint)) return;
    handleSnapPointChange(largest, createSnapPointChangeDetails(event));
  });
  const presentation = React.useMemo(
    () => ({hasSnapPoints, modal, showSwipeHandle, swipeDirection, revealFocusedElement}),
    [hasSnapPoints, modal, showSwipeHandle, swipeDirection, revealFocusedElement],
  );
  return (
    <DrawerPresentationContext.Provider value={presentation}>
      <BaseDrawer.Root
        modal={modal}
        snapPoints={snapPoints}
        snapPoint={activeSnapPoint}
        defaultSnapPoint={defaultSnapPoint}
        onSnapPointChange={handleSnapPointChange}
        swipeDirection={swipeDirection}
        {...props}
      />
    </DrawerPresentationContext.Provider>
  );
}

/**
 * Renders the drawer trigger.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerTrigger>Content</DrawerTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
const DrawerTrigger = ({ref, className, ...props}: Readonly<DrawerTrigger.Props>): React.ReactElement => {
  const primitiveRef = useDrawerElementRef(ref);
  return (
    <BaseDrawer.Trigger
      data-slot='drawer-trigger'
      ref={primitiveRef}
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
      {...props}
    />
  );
};

/**
 * Provides the drawer portal container.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Preserves the underlying primitive API for advanced composition
 * - {@link DrawerContent} already renders its own portal; configure it through `portalProps`. Compose DrawerPortal
 *   directly only for manual primitive compositions, whose children are Base UI's Viewport and Popup parts.
 *
 * @example
 * ```tsx
 * import {Drawer as BaseDrawer} from "@base-ui/react/drawer";
 *
 * <Drawer>
 *   <DrawerTrigger>Open</DrawerTrigger>
 *   <DrawerPortal>
 *     <DrawerOverlay />
 *     <BaseDrawer.Viewport>
 *       <BaseDrawer.Popup>
 *         <DrawerTitle>Custom composition</DrawerTitle>
 *         <DrawerClose>Close</DrawerClose>
 *       </BaseDrawer.Popup>
 *     </BaseDrawer.Viewport>
 *   </DrawerPortal>
 * </Drawer>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
const DrawerPortal: typeof BaseDrawer.Portal & {displayName?: string} = BaseDrawer.Portal;
/**
 * Renders the drawer close.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Preserves the underlying primitive API for advanced composition
 * - Renders a native `<button>` by default; use `render` to adopt another presentation, such as the package Button
 * - Place at least one inside every modal or `"trap-focus"` {@link DrawerContent}: it is the dismissal path for touch
 *   screen-reader users, who cannot press Escape or perform the swipe gesture. An icon-only close needs an
 *   accessible name, such as `aria-label`.
 *
 * @example
 * ```tsx
 * <DrawerContent>
 *   <DrawerTitle>Filters</DrawerTitle>
 *   <DrawerClose render={<Button variant='outline' />}>Close</DrawerClose>
 * </DrawerContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
function DrawerClose({className, ...props}: Readonly<DrawerClose.Props>): React.ReactElement {
  return (
    <BaseDrawer.Close
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
      {...props}
    />
  );
}

/**
 * Renders the drawer overlay.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 * - Ref targets the actual rendered backdrop, including non-div render targets
 * - {@link DrawerContent} already renders this backdrop for `modal={true}` drawers. Compose DrawerOverlay only inside a
 *   manual {@link DrawerPortal} composition.
 * - The backdrop is presentational (`role="presentation"`) and sits outside the popup, so it takes no content or
 *   controls. Base UI omits it for nested drawers unless `forceRender` is set.
 *
 * @example
 * ```tsx
 * import {Drawer as BaseDrawer} from "@base-ui/react/drawer";
 *
 * <DrawerPortal>
 *   <DrawerOverlay />
 *   <BaseDrawer.Viewport>
 *     <BaseDrawer.Popup>
 *       <DrawerTitle>Custom composition</DrawerTitle>
 *       <DrawerClose>Close</DrawerClose>
 *     </BaseDrawer.Popup>
 *   </BaseDrawer.Viewport>
 * </DrawerPortal>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
function DrawerOverlay(props: Readonly<DrawerOverlay.Props>): React.ReactElement {
  const {className, ref, ...otherProps} = props;
  const primitiveRef = useDrawerElementRef(ref);

  return (
    <BaseDrawer.Backdrop
      data-slot='drawer-overlay'
      ref={primitiveRef}
      className={typeof className === "function" ? (state) => cn(styles.backdrop, className(state)) : cn(styles.backdrop, className)}
      {...otherProps}
    />
  );
}

/**
 * A decorative drag surface, not an interactive control or a gesture engine.
 *
 * @remarks
 * - Renders a `<div>` element by default and supports the `render` prop for element composition
 * - Hidden from assistive technology (`aria-hidden`): it has no role, name or tab stop, so give it no meaningful
 *   content or accessible name
 * - Place it outside Base UI's `Drawer.Content` region, which keeps native controls out of mouse and pen dragging, for
 *   example before `props.children` in a function `render` of {@link DrawerContent}; Base UI's Viewport arbitrates
 *   the gesture. `Drawer`'s `showSwipeHandle` renders one in that position automatically.
 * - Dragging is never the only way to act: modal drawers still need a {@link DrawerClose} inside the popup
 *
 * @example
 * ```tsx
 * <DrawerContent
 *   render={(props) => (
 *     <section {...props}>
 *       <DrawerSwipeHandle />
 *       {props.children}
 *     </section>
 *   )}>
 *   <DrawerTitle>Custom handle</DrawerTitle>
 *   <DrawerClose>Close</DrawerClose>
 * </DrawerContent>
 * ```
 */
const DrawerSwipeHandle = ({ref, className, render, ...props}: Readonly<DrawerSwipeHandle.Props>): React.ReactElement =>
  useRender({
    defaultTagName: "div",
    ref,
    render,
    props: {
      "data-slot": "drawer-swipe-handle",
      ...mergeProps<"div">({className: cn(styles.handle, className), "aria-hidden": true}, props),
    },
  });

type DrawerRenderCallback = Exclude<BaseDrawer.Popup.Props["render"], React.ReactElement | undefined>;

function DrawerBody({children, showSwipeHandle}: Readonly<{children: React.ReactNode; showSwipeHandle: boolean}>): React.ReactElement {
  return (
    <>
      {showSwipeHandle ? <DrawerSwipeHandle /> : null}
      <BaseDrawer.Content
        data-slot='drawer-content'
        className={styles.content}>
        {children}
      </BaseDrawer.Content>
    </>
  );
}

/** Only mounted Popup rendering may normalize a pending/opaque element slot. */
function DecoratedDrawerElement({
  render,
  elementProps,
  children,
  showSwipeHandle,
}: Readonly<{
  render: React.ReactElement;
  elementProps: Parameters<DrawerRenderCallback>[0];
  children: React.ReactNode;
  showSwipeHandle: boolean;
}>): React.ReactElement {
  // eslint-disable-next-line react-x/no-children-to-array -- public React normalization, never private lazy field inspection.
  const elements = React.Children.toArray(render);
  const [element] = elements;
  if (elements.length !== 1 || !React.isValidElement<{children?: React.ReactNode}>(element) || element.type === React.Fragment) {
    throw new TypeError("DrawerContent render requires a single non-Fragment React element.");
  }
  // eslint-disable-next-line react-x/no-clone-element -- wrap content without taking SDK event/ref/focus ownership.
  const decorated = React.cloneElement(
    element,
    undefined,
    <DrawerBody showSwipeHandle={showSwipeHandle}>{children === undefined ? element.props.children : children}</DrawerBody>,
  );
  return useRender({render: decorated, props: {...elementProps}});
}

/**
 * Renders the drawer content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 * - Uses Portal → optional modal Backdrop → Viewport → Popup → Content
 * - Viewport owns pointer/touch arbitration; Content keeps native controls out of mouse/pen dragging
 * - Function render callbacks receive Base UI's actual popup state, including nested and swipe state
 * - `modal={false}` and `"trap-focus"` omit the blocking backdrop without changing Base UI's focus policy
 * - `portalProps` configures the internal Portal: `keepMounted` keeps the closed drawer mounted with `hidden`,
 *   preserving form state, and `container` chooses the element or shadow root that receives the portal
 * - Reports focus that lands beyond a partial snap point to `Drawer`, which requests its largest snap point
 * - Name the popup with a {@link DrawerTitle}; Base UI wires it, and any {@link DrawerDescription}, to the dialog
 * - Modal and `"trap-focus"` drawers keep focus inside the popup, so include a reachable {@link DrawerClose}: touch
 *   screen-reader users cannot press Escape or perform the swipe gesture
 *
 * @example
 * ```tsx
 * <Drawer>
 *   <DrawerTrigger>Edit profile</DrawerTrigger>
 *   <DrawerContent portalProps={{keepMounted: true}}>
 *     <DrawerTitle>Edit profile</DrawerTitle>
 *     <DrawerDescription>Update your display name.</DrawerDescription>
 *     <input aria-label='Display name' />
 *     <DrawerClose>Close</DrawerClose>
 *   </DrawerContent>
 * </Drawer>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
const DrawerContent = ({ref, ...props}: Readonly<DrawerContent.Props>): React.ReactElement => {
  const {className, children, render, portalProps, ...otherProps} = props;
  const {hasSnapPoints, modal, showSwipeHandle, swipeDirection, revealFocusedElement} = useDrawerPresentation();
  const primitiveRef = useDrawerElementRef(ref);
  const snapFocusRef = useSnapFocusReveal(revealFocusedElement);
  const popupRef = useMergedRefs<HTMLElement>(primitiveRef, snapFocusRef);
  const popupRender =
    render !== undefined && typeof render !== "function"
      ? (elementProps: Parameters<DrawerRenderCallback>[0]) => (
          <DecoratedDrawerElement
            render={render}
            elementProps={elementProps}
            showSwipeHandle={showSwipeHandle}>
            {children}
          </DecoratedDrawerElement>
        )
      : render;

  return (
    <DrawerPortal {...portalProps}>
      {modal === true && <DrawerOverlay data-snap-points={hasSnapPoints ? "" : undefined} />}
      <BaseDrawer.Viewport
        data-slot='drawer-viewport'
        data-modal={modal}
        className={styles.viewport}>
        <BaseDrawer.Popup
          data-slot='drawer-popup'
          data-swipe-axis={swipeDirection === "down" || swipeDirection === "up" ? "y" : "x"}
          data-snap-points={hasSnapPoints ? "" : undefined}
          ref={popupRef}
          render={popupRender}
          className={typeof className === "function" ? (state) => cn(styles.popup, className(state)) : cn(styles.popup, className)}
          {...otherProps}>
          <DrawerBody showSwipeHandle={showSwipeHandle}>{children}</DrawerBody>
        </BaseDrawer.Popup>
      </BaseDrawer.Viewport>
    </DrawerPortal>
  );
};

/**
 * Renders the drawer header.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerHeader>Content</DrawerHeader>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
function DrawerHeader(props: Readonly<DrawerHeader.Props>): React.ReactElement {
  const {children, className, render, ref, ...otherProps} = props;

  return useRender({
    defaultTagName: "div",
    ref,
    render,
    props: {
      "data-slot": "drawer-header",
      ...mergeProps<"div">({className: cn(styles.header, className)}, otherProps, {
        children,
      }),
    },
  });
}

/**
 * Renders the drawer footer.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerFooter>Content</DrawerFooter>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
function DrawerFooter(props: Readonly<DrawerFooter.Props>): React.ReactElement {
  const {children, className, render, ref, ...otherProps} = props;

  return useRender({
    defaultTagName: "div",
    ref,
    render,
    props: {
      "data-slot": "drawer-footer",
      ...mergeProps<"div">({className: cn(styles.footer, className)}, otherProps, {
        children,
      }),
    },
  });
}

/**
 * Renders the drawer title.
 *
 * @remarks
 * - Renders a `<h2>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerTitle>Content</DrawerTitle>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
function DrawerTitle(props: Readonly<DrawerTitle.Props>): React.ReactElement {
  const {className, ref, ...otherProps} = props;
  const primitiveRef = useDrawerElementRef(ref);

  return (
    <BaseDrawer.Title
      data-slot='drawer-title'
      ref={primitiveRef}
      className={typeof className === "function" ? (state) => cn(styles.title, className(state)) : cn(styles.title, className)}
      {...otherProps}
    />
  );
}

/**
 * Renders the drawer description.
 *
 * @remarks
 * - Renders a `<p>` element by default
 * - Built on {@link https://base-ui.com/react/components/drawer | Base UI Drawer}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <DrawerDescription>Content</DrawerDescription>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
function DrawerDescription(props: Readonly<DrawerDescription.Props>): React.ReactElement {
  const {className, ref, ...otherProps} = props;
  const primitiveRef = useDrawerElementRef(ref);

  return (
    <BaseDrawer.Description
      data-slot='drawer-description'
      ref={primitiveRef}
      className={typeof className === "function" ? (state) => cn(styles.description, className(state)) : cn(styles.description, className)}
      {...otherProps}
    />
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Drawer {
  export type Props<Payload = unknown> = DrawerProps<Payload>;
  export type State = Readonly<BaseDrawer.Root.State>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = DrawerTriggerProps;
  export type State = Readonly<BaseDrawer.Trigger.State>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerPortal {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = DrawerPortalProps;
  export type State = Readonly<BaseDrawer.Portal.State>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerClose {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = DrawerCloseProps;
  export type State = Readonly<BaseDrawer.Close.State>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerOverlay {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = DrawerOverlayProps;
  export type State = Readonly<BaseDrawer.Backdrop.State>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = DrawerContentProps;
  export type State = Readonly<BaseDrawer.Popup.State>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerSwipeHandle {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = DrawerSwipeHandleProps;
  export type State = Readonly<Record<string, never>>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerHeader {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = DrawerHeaderProps;
  export type State = Readonly<Record<string, never>>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerFooter {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = DrawerFooterProps;
  export type State = Readonly<Record<string, never>>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerTitle {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = DrawerTitleProps;
  export type State = Readonly<BaseDrawer.Title.State>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace DrawerDescription {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = DrawerDescriptionProps;
  export type State = Readonly<BaseDrawer.Description.State>;
}

Drawer.displayName = "Drawer";
DrawerTrigger.displayName = "DrawerTrigger";
DrawerPortal.displayName = "DrawerPortal";
DrawerClose.displayName = "DrawerClose";
DrawerOverlay.displayName = "DrawerOverlay";
DrawerContent.displayName = "DrawerContent";
DrawerSwipeHandle.displayName = "DrawerSwipeHandle";
DrawerHeader.displayName = "DrawerHeader";
DrawerFooter.displayName = "DrawerFooter";
DrawerTitle.displayName = "DrawerTitle";
DrawerDescription.displayName = "DrawerDescription";

export {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerSwipeHandle,
  DrawerTitle,
  DrawerTrigger,
};
