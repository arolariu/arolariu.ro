"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Popover as BasePopover} from "@base-ui/react/popover";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./popover.module.css";

interface PopoverProps extends React.ComponentPropsWithRef<typeof BasePopover.Root> {}

interface PopoverTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BasePopover.Trigger>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Enables child element composition instead of rendering the default wrapper.
   * @default false
   * @deprecated Prefer Base UI's `render` prop.
   */
  asChild?: boolean;
}

interface PopoverAnchorProps extends React.ComponentPropsWithRef<"div"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Overrides the default rendered element while preserving component behavior.
   * @default undefined
   */
  render?: useRender.RenderProp<Record<string, never>>;
  /**
   * Enables child element composition instead of rendering the default wrapper.
   * @default false
   * @deprecated Prefer Base UI's `render` prop.
   */
  asChild?: boolean;
}

interface PopoverContentProps extends Omit<React.ComponentPropsWithRef<typeof BasePopover.Positioner>, "className"> {
  /**
   * Applies additional CSS classes to the component root element.
   * @default undefined
   */
  className?: string;
  /**
   * Offsets the floating content from its anchor in pixels.
   * @default 4
   */
  sideOffset?: number;
}

/**
 * Coordinates popover state and accessibility behavior.
 *
 * @remarks
 * - Delegates structure and state to the underlying Base UI primitive
 * - Built on {@link https://base-ui.com/react/components/popover | Base UI Popover}
 * - Preserves the underlying primitive API for advanced composition
 *
 * @example
 * ```tsx
 * <Popover>Content</Popover>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/popover | Base UI Documentation}
 */
function Popover(props: Readonly<Popover.Props>): React.ReactElement {
  return <BasePopover.Root {...props} />;
}

/**
 * Renders the popover trigger.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/popover | Base UI Popover}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <PopoverTrigger>Content</PopoverTrigger>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/popover | Base UI Documentation}
 */
const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTrigger.Props>(
  (props: Readonly<PopoverTrigger.Props>, ref): React.ReactElement => {
    // eslint-disable-next-line sonarjs/deprecation -- backward-compatible asChild support is part of the public API.
    const {asChild = false, children, className, render, ...otherProps} = props;
    const renderProp = asChild && React.isValidElement(children) ? children : render;

    return (
      <BasePopover.Trigger
        ref={ref}
        {...otherProps}
        render={useRender({
          defaultTagName: "button",
          render: renderProp as never,
          props: mergeProps({className}, {}),
        })}>
        {renderProp ? undefined : children}
      </BasePopover.Trigger>
    );
  },
);

/**
 * Renders the popover anchor.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/popover | Base UI Popover}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <PopoverAnchor>Content</PopoverAnchor>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/popover | Base UI Documentation}
 */
function PopoverAnchor(props: Readonly<PopoverAnchor.Props>): React.ReactElement {
  // eslint-disable-next-line sonarjs/deprecation -- backward-compatible asChild support is part of the public API.
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return useRender({
    defaultTagName: "div",
    render: renderProp as never,
    props: mergeProps({className: cn(styles.anchor, className)}, otherProps, {
      children: renderProp ? undefined : children,
    }),
  });
}

/**
 * Renders the popover content.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on {@link https://base-ui.com/react/components/popover | Base UI Popover}
 * - Supports the `render` prop for element composition
 *
 * @example
 * ```tsx
 * <PopoverContent>Content</PopoverContent>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/popover | Base UI Documentation}
 */
const PopoverContent = React.forwardRef<React.ComponentRef<typeof BasePopover.Popup>, PopoverContent.Props>(
  (props: Readonly<PopoverContent.Props>, ref): React.ReactElement => {
    const {className, children, render, sideOffset = 4, ...otherProps} = props;

    return (
      <BasePopover.Portal>
        <BasePopover.Positioner
          sideOffset={sideOffset}
          {...otherProps}
          render={useRender({
            defaultTagName: "div",
            props: mergeProps({className: styles.positioner}, {}),
          })}>
          <BasePopover.Popup
            ref={ref}
            render={useRender({
              defaultTagName: "div",
              render: render as never,
              props: mergeProps({className: cn(styles.popup, className)}, {}),
            })}>
            {children}
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    );
  },
);

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Popover {
  export type Props = PopoverProps;
  export type State = BasePopover.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace PopoverTrigger {
  export type Props = PopoverTriggerProps;
  export type State = BasePopover.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace PopoverAnchor {
  export type Props = PopoverAnchorProps;
  export type State = Record<string, never>;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace PopoverContent {
  export type Props = PopoverContentProps;
  export type State = BasePopover.Popup.State;
}

Popover.displayName = "Popover";
PopoverTrigger.displayName = "PopoverTrigger";
PopoverAnchor.displayName = "PopoverAnchor";
PopoverContent.displayName = "PopoverContent";

export {Popover, PopoverAnchor, PopoverContent, PopoverTrigger};
