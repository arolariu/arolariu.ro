"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Popover as BasePopover} from "@base-ui/react/popover";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./popover.module.css";

interface PopoverProps extends React.ComponentPropsWithRef<typeof BasePopover.Root> {}

interface PopoverTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BasePopover.Trigger>, "className"> {
  className?: string;
  /** @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface PopoverAnchorProps extends React.ComponentPropsWithRef<"div"> {
  className?: string;
  render?: useRender.RenderProp<Record<string, never>>;
  /** @deprecated Prefer the `render` prop. */
  asChild?: boolean;
}

interface PopoverContentProps extends Omit<React.ComponentPropsWithRef<typeof BasePopover.Positioner>, "className"> {
  className?: string;
  sideOffset?: number;
}

/**
 * Coordinates popover state and accessibility behavior.
 */
function Popover(props: Readonly<Popover.Props>): React.ReactElement {
  return <BasePopover.Root {...props} />;
}

/**
 * Renders the popover trigger using canonical render composition.
 */
function PopoverTrigger(props: Readonly<PopoverTrigger.Props>): React.ReactElement {
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return (
    <BasePopover.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: renderProp as never,
        props: mergeProps({className}, {}),
      })}>
      {renderProp ? undefined : children}
    </BasePopover.Trigger>
  );
}

/**
 * Renders the custom popover anchor wrapper.
 */
function PopoverAnchor(props: Readonly<PopoverAnchor.Props>): React.ReactElement {
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
 * Renders the popover popup with composed positioner and surface styling.
 */
function PopoverContent(props: Readonly<PopoverContent.Props>): React.ReactElement {
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
}

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

export {Popover, PopoverAnchor, PopoverContent, PopoverTrigger};
