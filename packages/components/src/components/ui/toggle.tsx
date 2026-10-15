"use client";

import {Toggle as BaseToggle} from "@base-ui/react/toggle";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./toggle.module.css";

/** Supported toggle visual treatments. */
export type ToggleVariant = "default" | "outline";
/** Supported toggle size presets. */
export type ToggleSize = "default" | "sm" | "lg";
/** Primitive-owned pressed and disabled state for render/class callbacks. */
export type ToggleState = BaseToggle.State;

/** Readonly visual options for generating toggle classes without rendering. */
export type ToggleVariantOptions = Readonly<
  Partial<{
    /**
     * Controls the rendered visual variant.
     * @default "default"
     */
    variant: ToggleVariant | undefined;
    /**
     * Controls the rendered size variant.
     * @default "default"
     */
    size: ToggleSize | undefined;
    /**
     * Applies additional CSS classes to the component root element.
     * @default undefined
     */
    className: string | undefined;
  }>
>;

/** Returns the CSS module classes used by the toggle wrapper. */
export function toggleVariants({variant = "default", size = "default", className}: Readonly<ToggleVariantOptions> = {}): string {
  const variantClass = variant === "outline" ? styles.outline : styles.default;
  const sizeClass = size === "sm" ? styles.sizeSm : size === "lg" ? styles.sizeLg : styles.sizeDefault;

  return cn(styles.root, variantClass, sizeClass, className);
}

/** Readonly primitive toggle props with visual presets and a polymorphic DOM ref. */
export type ToggleProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseToggle>, "ref">
    & React.RefAttributes<HTMLElement>
    & Partial<{
      /** Visual treatment. @default "default" */
      variant: ToggleVariant | undefined;
      /** Size preset. @default "default" */
      size: ToggleSize | undefined;
    }>
>;

/**
 * Renders the toggle control.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on {@link https://base-ui.com/react/components/toggle | Base UI Toggle}
 * - Supports the `render` prop for element composition
 * - Render/class callbacks receive only actual Base UI pressed/disabled state
 * - Set nativeButton=false for non-button render targets; refs target HTMLElement
 * - Cancel changes via details.cancel(), or handlers via event.preventBaseUIHandler()
 * - Icon-only content requires an action-specific aria-label or aria-labelledby
 *
 * @example
 * ```tsx
 * <Toggle>Content</Toggle>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toggle | Base UI Documentation}
 */
const Toggle = (props: Readonly<Toggle.Props>): React.ReactElement => {
  const {ref, className, size = "default", variant = "default", ...otherProps} = props;
  // The SDK declares a button ref, but useButton/render forwards the actual HTMLElement.
  const handleRef = React.useCallback(
    (element: HTMLElement | null): ReturnType<React.RefCallback<HTMLElement>> => {
      if (typeof ref === "function") return ref(element);
      if (ref) ref.current = element;
    },
    [ref],
  );

  return (
    <BaseToggle
      data-slot='toggle'
      ref={handleRef}
      data-variant={variant}
      data-size={size}
      className={(state) => toggleVariants({variant, size, className: typeof className === "function" ? className(state) : className})}
      {...otherProps}
    />
  );
};

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Toggle {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- preserves the documented component namespace API alongside named props
  export type Props = ToggleProps;
  export type State = BaseToggle.State;
}

Toggle.displayName = "Toggle";

export {Toggle};
