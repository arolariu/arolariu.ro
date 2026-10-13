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
export type SheetTriggerProps = Readonly<Omit<BaseDialog.Trigger.Props, "ref"> & {ref?: React.Ref<HTMLElement>; asChild?: boolean}>;
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
  }
>;
/** Layout props use the actual Base UI polymorphic render contract. */
export type SheetHeaderProps = Readonly<
  Omit<useRender.ComponentProps<"div", Record<string, never>>, "ref"> & {
    ref?: React.Ref<HTMLElement>;
    /** Legacy single-element slot. Prefer `render`. @default false */
    asChild?: boolean;
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

function legacyChild(children: React.ReactNode, asChild: boolean): React.ReactElement | undefined {
  if (!asChild) return undefined;
  if (!React.isValidElement(children) || children.type === React.Fragment) {
    throw new TypeError("Sheet asChild requires a single non-Fragment React element.");
  }
  return children;
}

/** Coordinates a sheet using the real modal Dialog primitive, without an extra DOM wrapper. */
function Sheet<Payload = unknown>(props: Readonly<Sheet.Props<Payload>>): React.ReactElement {
  return <BaseDialog.Root {...props} />;
}
Sheet.displayName = "Sheet";

/** Portals sheet parts; supports Base UI's `keepMounted` contract. */
const SheetPortal = BaseDialog.Portal;

/** Closes a sheet without imposing the automatic close icon's styling. */
function SheetClose(props: Readonly<SheetClose.Props>): React.ReactElement {
  return (
    <BaseDialog.Close
      data-slot='sheet-close'
      {...props}
    />
  );
}
SheetClose.displayName = "SheetClose";

/** Opens a sheet; render callbacks receive the primitive's live open/disabled state. */
const SheetTrigger = React.forwardRef<HTMLElement, SheetTrigger.Props>(
  ({asChild = false, children, render, nativeButton, ...props}: Readonly<SheetTrigger.Props>, ref): React.ReactElement => {
    const child = legacyChild(children, asChild);
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
        {...props}
        ref={primitiveRef}
        nativeButton={nativeButton ?? (child && typeof child.type === "string" ? child.type === "button" : true)}
        render={child ?? render}>
        {child ? undefined : children}
      </BaseDialog.Trigger>
    );
  },
);
SheetTrigger.displayName = "SheetTrigger";

/** Renders the backdrop below the sheet, forwarding primitive-owned composition unchanged. */
function SheetOverlay({className, ...props}: Readonly<SheetOverlay.Props>): React.ReactElement {
  return (
    <BaseDialog.Backdrop
      data-slot='sheet-overlay'
      {...props}
      className={cn(styles.backdrop, className)}
    />
  );
}
SheetOverlay.displayName = "SheetOverlay";

/**
 * Portals a sheet from one of four edges. Base UI owns focus and modal behavior.
 * The automatic close is last in DOM order and can be disabled.
 */
const SheetContent = React.forwardRef<HTMLDivElement, SheetContent.Props>(
  (
    {className, children, render, side = "right", showCloseButton = true, ...props}: Readonly<React.PropsWithoutRef<SheetContent.Props>>,
    ref,
  ): React.ReactElement => {
    const renderElement = React.isValidElement<{children?: React.ReactNode}>(render) ? render : undefined;
    const content = (
      <>
        {children === undefined ? renderElement?.props.children : children}
        {showCloseButton ? (
          <SheetClose
            aria-label='Close'
            render={
              <Button
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
        ) : null}
      </>
    );
    // eslint-disable-next-line react-x/no-clone-element -- extend only top-level children; Base UI still owns state, event and ref merging.
    const popupRender = renderElement ? React.cloneElement(renderElement, {children: content}) : render;
    return (
      <SheetPortal>
        <SheetOverlay />
        <BaseDialog.Popup
          data-slot='sheet-content'
          data-side={side}
          {...props}
          ref={ref}
          render={popupRender}
          className={cn(styles.popup, styles[side], className)}>
          {content}
        </BaseDialog.Popup>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = "SheetContent";

/** Composes the sheet heading layout while preserving child content, events and refs. */
const SheetHeader = React.forwardRef<HTMLElement, SheetHeader.Props>(
  (
    {asChild = false, children, className, render, ...props}: Readonly<React.PropsWithoutRef<SheetHeader.Props>>,
    ref,
  ): React.ReactElement => {
    const child = legacyChild(children, asChild);
    return useRender({
      defaultTagName: "div",
      ref,
      render: child ?? render,
      props: {
        "data-slot": "sheet-header",
        ...mergeProps<"div">({className: cn(styles.header, className)}, props, {
          children: child ? undefined : children,
        }),
      },
    });
  },
);
SheetHeader.displayName = "SheetHeader";

/** Composes actions at the end of the sheet without creating a nested wrapper. */
const SheetFooter = React.forwardRef<HTMLElement, SheetFooter.Props>(
  (
    {asChild = false, children, className, render, ...props}: Readonly<React.PropsWithoutRef<SheetFooter.Props>>,
    ref,
  ): React.ReactElement => {
    const child = legacyChild(children, asChild);
    return useRender({
      defaultTagName: "div",
      ref,
      render: child ?? render,
      props: {
        "data-slot": "sheet-footer",
        ...mergeProps<"div">({className: cn(styles.footer, className)}, props, {
          children: child ? undefined : children,
        }),
      },
    });
  },
);
SheetFooter.displayName = "SheetFooter";

/** Renders the accessible sheet heading using primitive-owned composition. */
function SheetTitle({className, ...props}: Readonly<SheetTitle.Props>): React.ReactElement {
  return (
    <BaseDialog.Title
      data-slot='sheet-title'
      {...props}
      className={cn(styles.title, className)}
    />
  );
}
SheetTitle.displayName = "SheetTitle";

/** Renders the accessible sheet description using primitive-owned composition. */
function SheetDescription({className, ...props}: Readonly<SheetDescription.Props>): React.ReactElement {
  return (
    <BaseDialog.Description
      data-slot='sheet-description'
      {...props}
      className={cn(styles.description, className)}
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
