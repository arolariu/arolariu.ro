"use client";

import {Dialog as BaseDialog} from "@base-ui/react/dialog";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import {X} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {Button} from "./button";
import styles from "./sheet.module.css";

/** Viewport edge from which a sheet enters. */
export type SheetSide = "top" | "right" | "bottom" | "left";
/** Base UI owns modal state, dismissal, focus and trigger payloads. */
export type SheetProps<Payload = unknown> = Readonly<BaseDialog.Root.Props<Payload>>;
/** Trigger props with the existing single-element slot compatibility. */
export type SheetTriggerProps = Readonly<Omit<BaseDialog.Trigger.Props, "ref"> & {ref?: React.Ref<HTMLElement>}>;
/** Unstyled primitive dismissal control. */
export type SheetCloseProps = Readonly<React.ComponentPropsWithRef<typeof BaseDialog.Close>>;
/** Primitive backdrop props with presentation classes. */
export type SheetOverlayProps = Readonly<Omit<React.ComponentPropsWithRef<typeof BaseDialog.Backdrop>, "className"> & {className?: string}>;
/** Sheet popup options retain Base UI's real state, ref and focus contracts. */
export type SheetContentProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseDialog.Popup>, "className"> & {
    className?: string;
    /** Viewport edge. @default "right" */
    side?: SheetSide;
    /** Append the automatic icon close after content. @default true */
    showCloseButton?: boolean;
    /** Caller-localizable accessible name for the automatic close. @default "Close" */
    closeLabel?: string;
    /**
     * Props for the internal Portal, for example `keepMounted` (keep the closed sheet and its form state mounted
     * but hidden) or `container` (portal into a theme-scoped element, shadow root or another document). Content
     * always supplies the portal's children.
     */
    portalProps?: Readonly<Omit<React.ComponentPropsWithRef<typeof BaseDialog.Portal>, "children">>;
  }
>;
/** Layout props use the actual Base UI polymorphic render contract. */
export type SheetHeaderProps = Readonly<
  Omit<useRender.ComponentProps<"div", Record<string, never>>, "ref"> & {
    ref?: React.Ref<HTMLElement>;
  }
>;
/** Footer layout positioned after sheet content. */
export type SheetFooterProps = Readonly<SheetHeaderProps>;
/** Accessible sheet heading. */
export type SheetTitleProps = Readonly<Omit<React.ComponentPropsWithRef<typeof BaseDialog.Title>, "className"> & {className?: string}>;
/** Accessible sheet description. */
export type SheetDescriptionProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseDialog.Description>, "className"> & {className?: string}
>;

type PrimitiveRenderCallback = Exclude<BaseDialog.Popup.Props["render"], React.ReactElement | undefined>;

/** Base UI keeps root modality private, so the styled Content reads the value its `Sheet` received. */
const SheetModalityContext = React.createContext<NonNullable<BaseDialog.Root.Props["modal"]>>(true);

function DecoratedSheetElement({
  render,
  elementProps,
  closeControl,
}: Readonly<{
  render: React.ReactElement;
  elementProps: Parameters<PrimitiveRenderCallback>[0];
  closeControl: React.ReactNode;
}>): React.ReactElement {
  // eslint-disable-next-line react-x/no-children-to-array -- public React normalization supports Flight/lazy slots without reading private lazy fields.
  const elements = React.Children.toArray(render);
  const [element] = elements;
  if (elements.length !== 1 || !React.isValidElement<{children?: React.ReactNode}>(element) || element.type === React.Fragment) {
    throw new TypeError("Sheet render requires a single non-Fragment React element.");
  }
  const children = Object.hasOwn(element.props, "children") ? element.props.children : elementProps.children;
  // eslint-disable-next-line react-x/no-clone-element -- preserve Base UI's top-level element-child precedence before appending the close.
  const decorated = React.cloneElement(element, {
    children: (
      <>
        {children}
        {closeControl}
      </>
    ),
  });
  return useRender({render: decorated, props: {...elementProps}});
}

/**
 * Coordinates a sheet using the real Base UI Dialog primitive, without an extra DOM wrapper.
 *
 * @remarks
 * - Base UI owns open state, focus, dismissal, trigger payloads and modality.
 * - `modal` defaults to `true`. `SheetContent` renders its page-blocking backdrop only for `modal={true}`;
 *   `false` and `"trap-focus"` keep the rest of the page visible and pressable, as Base UI documents (an outside
 *   press still dismisses the sheet unless `disablePointerDismissal` is set).
 * - Focus-trapping modes need a close control inside the sheet so touch screen-reader users can leave it.
 *
 * @example
 * ```tsx
 * <Sheet modal={false}>
 *   <SheetTrigger>Open filters</SheetTrigger>
 *   <SheetContent side='left'>
 *     <SheetTitle>Filters</SheetTitle>
 *   </SheetContent>
 * </Sheet>
 * ```
 */
function Sheet<Payload = unknown>({modal = true, ...props}: Readonly<Sheet.Props<Payload>>): React.ReactElement {
  return (
    <SheetModalityContext.Provider value={modal}>
      <BaseDialog.Root
        modal={modal}
        {...props}
      />
    </SheetModalityContext.Provider>
  );
}
Sheet.displayName = "Sheet";

/** Portals sheet parts; supports Base UI's `keepMounted` contract. */
const SheetPortal = BaseDialog.Portal;

/** Closes a sheet without imposing the automatic close icon's styling. */
function SheetClose({className, ...props}: Readonly<SheetClose.Props>): React.ReactElement {
  return (
    <BaseDialog.Close
      data-slot='sheet-close'
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
      {...props}
    />
  );
}
SheetClose.displayName = "SheetClose";

/** Opens a sheet; render callbacks receive the primitive's live open/disabled state. */
const SheetTrigger = ({ref, children, render, nativeButton, className, ...props}: Readonly<SheetTrigger.Props>): React.ReactElement => {
  const primitiveRef: React.RefCallback<HTMLElement> = React.useCallback(
    (element) => {
      if (typeof ref === "function") return ref(element);
      if (ref) ref.current = element;
      return undefined;
    },
    [ref],
  );
  return (
    <BaseDialog.Trigger
      data-slot='sheet-trigger'
      ref={primitiveRef}
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
      nativeButton={nativeButton}
      render={render}
      {...props}>
      {children}
    </BaseDialog.Trigger>
  );
};
SheetTrigger.displayName = "SheetTrigger";

/** Renders the backdrop below the sheet, forwarding primitive-owned composition unchanged. */
function SheetOverlay({className, ...props}: Readonly<SheetOverlay.Props>): React.ReactElement {
  return (
    <BaseDialog.Backdrop
      data-slot='sheet-overlay'
      className={cn(styles.backdrop, className)}
      {...props}
    />
  );
}
SheetOverlay.displayName = "SheetOverlay";

/**
 * Portals a sheet from one of four edges, above a page-blocking backdrop when the sheet is fully modal.
 *
 * @remarks
 * - Base UI owns focus, dismissal and modal behavior. The backdrop renders only when the enclosing `Sheet` has
 *   `modal={true}` (its default); under a raw Base UI root the backdrop is always rendered.
 * - The automatic close is last in DOM order; opt out with `showCloseButton={false}` only when another close
 *   control remains inside the sheet.
 * - `portalProps` configures the internal Portal: `keepMounted` keeps the closed sheet mounted with `hidden`,
 *   preserving form state, and `container` chooses the element or shadow root that receives the portal.
 *
 * @example
 * ```tsx
 * <Sheet>
 *   <SheetTrigger>Edit filters</SheetTrigger>
 *   <SheetContent
 *     side='left'
 *     portalProps={{keepMounted: true}}>
 *     <SheetTitle>Filters</SheetTitle>
 *   </SheetContent>
 * </Sheet>
 * ```
 */
const SheetContent = ({
  ref,
  className,
  children,
  render,
  side = "right",
  showCloseButton = true,
  closeLabel = "Close",
  portalProps,
  ...props
}: Readonly<SheetContent.Props>): React.ReactElement => {
  const modal = React.useContext(SheetModalityContext);
  const closeControl = showCloseButton ? (
    <SheetClose
      aria-label={closeLabel}
      render={
        <Button
          aria-label={closeLabel}
          variant='ghost'
          size='icon-sm'
          className={cn(styles.close)}
        />
      }>
      <X
        aria-hidden='true'
        className={styles.closeIcon}
      />
    </SheetClose>
  ) : null;
  const decorateElement = showCloseButton && render !== undefined && typeof render !== "function";
  return (
    <SheetPortal {...portalProps}>
      {modal === true ? <SheetOverlay /> : null}
      <BaseDialog.Popup
        data-slot='sheet-content'
        data-side={side}
        ref={ref}
        render={
          decorateElement
            ? (elementProps) => (
                <DecoratedSheetElement
                  render={render}
                  elementProps={elementProps}
                  closeControl={closeControl}
                />
              )
            : render
        }
        className={cn(styles.popup, styles[side], className)}
        {...props}>
        {decorateElement ? (
          children
        ) : (
          <>
            {children}
            {closeControl}
          </>
        )}
      </BaseDialog.Popup>
    </SheetPortal>
  );
};
SheetContent.displayName = "SheetContent";

/** Composes the sheet heading layout while preserving child content, events and refs. */
const SheetHeader = ({ref, children, className, render, ...props}: Readonly<SheetHeader.Props>): React.ReactElement => {
  return useRender({
    defaultTagName: "div",
    ref,
    render,
    props: {
      "data-slot": "sheet-header",
      ...mergeProps<"div">({className: cn(styles.header, className)}, props, {
        children,
      }),
    },
  });
};
SheetHeader.displayName = "SheetHeader";

/** Composes actions at the end of the sheet without creating a nested wrapper. */
const SheetFooter = ({ref, children, className, render, ...props}: Readonly<SheetFooter.Props>): React.ReactElement => {
  return useRender({
    defaultTagName: "div",
    ref,
    render,
    props: {
      "data-slot": "sheet-footer",
      ...mergeProps<"div">({className: cn(styles.footer, className)}, props, {
        children,
      }),
    },
  });
};
SheetFooter.displayName = "SheetFooter";

/** Renders the accessible sheet heading using primitive-owned composition. */
function SheetTitle({className, ...props}: Readonly<SheetTitle.Props>): React.ReactElement {
  return (
    <BaseDialog.Title
      data-slot='sheet-title'
      className={cn(styles.title, className)}
      {...props}
    />
  );
}
SheetTitle.displayName = "SheetTitle";

/** Renders the accessible sheet description using primitive-owned composition. */
function SheetDescription({className, ...props}: Readonly<SheetDescription.Props>): React.ReactElement {
  return (
    <BaseDialog.Description
      data-slot='sheet-description'
      className={cn(styles.description, className)}
      {...props}
    />
  );
}
SheetDescription.displayName = "SheetDescription";

// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace Sheet {
  export type Props<Payload = unknown> = SheetProps<Payload>;
  export type State = BaseDialog.Root.State;
  export type Actions = BaseDialog.Root.Actions;
  export type ChangeEventDetails = BaseDialog.Root.ChangeEventDetails;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SheetTrigger {
  export type Props = Readonly<SheetTriggerProps>;
  export type State = BaseDialog.Trigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SheetClose {
  export type Props = Readonly<SheetCloseProps>;
  export type State = BaseDialog.Close.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SheetOverlay {
  export type Props = Readonly<SheetOverlayProps>;
  export type State = BaseDialog.Backdrop.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SheetContent {
  export type Props = Readonly<SheetContentProps>;
  export type State = BaseDialog.Popup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SheetHeader {
  export type Props = Readonly<SheetHeaderProps>;
  export type State = Record<string, never>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SheetFooter {
  export type Props = Readonly<SheetFooterProps>;
  export type State = Record<string, never>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SheetTitle {
  export type Props = Readonly<SheetTitleProps>;
  export type State = BaseDialog.Title.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SheetDescription {
  export type Props = Readonly<SheetDescriptionProps>;
  export type State = BaseDialog.Description.State;
}

export {Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetOverlay, SheetPortal, SheetTitle, SheetTrigger};
