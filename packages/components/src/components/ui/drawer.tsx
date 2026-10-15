"use client";

import {Drawer as BaseDrawer} from "@base-ui/react/drawer";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

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
export type DrawerContentProps = Readonly<Omit<BaseDrawer.Popup.Props, "ref"> & {ref?: React.Ref<HTMLElement>}>;
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

interface DrawerPresentation {
  readonly hasSnapPoints: boolean;
  readonly modal: NonNullable<BaseDrawer.Root.Props["modal"]>;
  readonly showSwipeHandle: boolean;
  readonly swipeDirection: NonNullable<BaseDrawer.Root.Props["swipeDirection"]>;
}

const DrawerPresentationContext = React.createContext<DrawerPresentation | null>(null);

function useDrawerPresentation(): DrawerPresentation {
  const context = React.useContext(DrawerPresentationContext);
  if (!context) throw new Error("DrawerContent must be used within Drawer.");
  return context;
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
 * - Adds presentation context only; Base UI owns open state and snap-point selection
 * - Handles are opt-in with `showSwipeHandle`; supplied snap points are passed through unchanged
 *
 * @example
 * ```tsx
 * <Drawer showSwipeHandle>
 *   <DrawerTrigger>Open</DrawerTrigger>
 *   <DrawerContent><DrawerTitle>Details</DrawerTitle></DrawerContent>
 * </Drawer>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
function Drawer<Payload = unknown>({
  modal = true,
  showSwipeHandle = false,
  snapPoints,
  swipeDirection = "down",
  ...props
}: Readonly<Drawer.Props<Payload>>): React.ReactElement {
  const hasSnapPoints = Boolean(snapPoints?.length);
  const presentation = React.useMemo(
    () => ({hasSnapPoints, modal, showSwipeHandle, swipeDirection}),
    [hasSnapPoints, modal, showSwipeHandle, swipeDirection],
  );
  return (
    <DrawerPresentationContext.Provider value={presentation}>
      <BaseDrawer.Root
        modal={modal}
        snapPoints={snapPoints}
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
 *
 * @example
 * ```tsx
 * <DrawerPortal>Content</DrawerPortal>
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
 *
 * @example
 * ```tsx
 * <DrawerClose>Content</DrawerClose>
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
 *
 * @example
 * ```tsx
 * <DrawerOverlay>Content</DrawerOverlay>
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
 * Place it outside Drawer.Content for mouse/pen dragging; Viewport arbitrates the gesture.
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
 *
 * @example
 * ```tsx
 * <DrawerContent>Content</DrawerContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/drawer | Base UI Documentation}
 */
const DrawerContent = ({ref, ...props}: Readonly<DrawerContent.Props>): React.ReactElement => {
  const {className, children, render, ...otherProps} = props;
  const {hasSnapPoints, modal, showSwipeHandle, swipeDirection} = useDrawerPresentation();
  const primitiveRef = useDrawerElementRef(ref);
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
    <DrawerPortal>
      {modal === true && <DrawerOverlay data-snap-points={hasSnapPoints ? "" : undefined} />}
      <BaseDrawer.Viewport
        data-slot='drawer-viewport'
        data-modal={modal}
        className={styles.viewport}>
        <BaseDrawer.Popup
          data-slot='drawer-popup'
          data-swipe-axis={swipeDirection === "down" || swipeDirection === "up" ? "y" : "x"}
          data-snap-points={hasSnapPoints ? "" : undefined}
          ref={primitiveRef}
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
