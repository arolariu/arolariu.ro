"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Tooltip as BaseTooltip} from "@base-ui/react/tooltip";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./tooltip.module.css";

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

interface TooltipProps extends Omit<React.ComponentPropsWithRef<typeof BaseTooltip.Root>, "delay"> {
  delayDuration?: number;
}

interface TooltipTriggerProps extends Omit<React.ComponentPropsWithRef<typeof BaseTooltip.Trigger>, "className"> {
  className?: string;
  /** @deprecated Prefer Base UI's `render` prop. */
  asChild?: boolean;
}

interface TooltipContentProps extends Omit<React.ComponentPropsWithRef<typeof BaseTooltip.Popup>, "className"> {
  className?: string;
  sideOffset?: number;
  side?: "top" | "right" | "bottom" | "left";
}

const TooltipProvider = ({children}: Readonly<TooltipProviderProps>): React.ReactNode => children;
TooltipProvider.displayName = "TooltipProvider";

function Tooltip(props: Readonly<Tooltip.Props>): React.ReactElement {
  const {delayDuration, ...otherProps} = props;
  const tooltipProps = delayDuration === undefined ? otherProps : {...otherProps, delay: delayDuration};

  return <BaseTooltip.Root {...tooltipProps} />;
}

function TooltipTrigger(props: Readonly<TooltipTrigger.Props>): React.ReactElement {
  const {asChild = false, children, className, render, ...otherProps} = props;
  const renderProp = asChild && React.isValidElement(children) ? children : render;

  return (
    <BaseTooltip.Trigger
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: renderProp as never,
        props: mergeProps({className: cn(styles.trigger, className)}, {}),
      })}>
      {renderProp ? undefined : children}
    </BaseTooltip.Trigger>
  );
}

function TooltipContent(props: Readonly<TooltipContent.Props>): React.ReactElement {
  const {className, children, render, side = "top", sideOffset = 4, ...otherProps} = props;

  return (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        side={side}
        sideOffset={sideOffset}>
        <BaseTooltip.Popup
          {...otherProps}
          render={useRender({
            defaultTagName: "div",
            render: render as never,
            props: mergeProps({className: cn(styles.popup, className)}, {}),
          })}>
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Tooltip {
  export type Props = TooltipProps;
  export type State = BaseTooltip.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TooltipTrigger {
  export type Props = TooltipTriggerProps;
  export type State = BaseTooltip.Trigger.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace TooltipContent {
  export type Props = TooltipContentProps;
  export type State = BaseTooltip.Popup.State;
}

export {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger};
