"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Toggle as BaseToggle} from "@base-ui/react/toggle";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./toggle.module.css";

export type ToggleVariant = "default" | "outline";
export type ToggleSize = "default" | "sm" | "lg";

export interface ToggleVariantOptions {
  variant?: ToggleVariant;
  size?: ToggleSize;
  className?: string;
}

/** Returns the CSS module classes used by the toggle wrapper. */
export function toggleVariants({variant = "default", size = "default", className}: Readonly<ToggleVariantOptions> = {}): string {
  const variantClass = variant === "outline" ? styles.outline : styles.default;
  const sizeClass = size === "sm" ? styles.sizeSm : size === "lg" ? styles.sizeLg : styles.sizeDefault;

  return cn(styles.root, variantClass, sizeClass, className);
}

export interface ToggleProps extends Omit<React.ComponentPropsWithRef<typeof BaseToggle>, "className"> {
  className?: string;
  variant?: ToggleVariant;
  size?: ToggleSize;
}

/**
 * Renders a styled Base UI toggle using the canonical render composition pattern.
 */
function Toggle(props: Readonly<Toggle.Props>): React.ReactElement {
  const {className, children, render, size, variant, ...otherProps} = props;

  return (
    <BaseToggle
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className: toggleVariants({variant, size, className})}, {}),
      })}>
      {children}
    </BaseToggle>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Toggle {
  export type Props = ToggleProps;
  export type State = BaseToggle.State;
}

export {Toggle};
