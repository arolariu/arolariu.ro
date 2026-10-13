"use client";

import {Button as ButtonPrimitive} from "@base-ui/react/button";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./button.module.css";

const variantStyles: Record<ButtonVariant, string> = {
  default: styles.default!,
  destructive: styles.destructive!,
  outline: styles.outline!,
  secondary: styles.secondary!,
  ghost: styles.ghost!,
  link: styles.link!,
};

const sizeStyles: Record<ButtonSize, string> = {
  default: styles.sizeDefault!,
  xs: styles.sizeXs!,
  sm: styles.sizeSm!,
  lg: styles.sizeLg!,
  icon: styles.sizeIcon!,
  "icon-xs": styles.sizeIconXs!,
  "icon-sm": styles.sizeIconSm!,
  "icon-lg": styles.sizeIconLg!,
};

/** Supported visual treatments for {@link Button}. */
export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
/** Text and icon-only size presets for {@link Button}. */
export type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

/**
 * Primitive-owned button state augmented with the selected visual presets.
 */
export interface ButtonState extends Readonly<ButtonPrimitive.State> {
  readonly variant: ButtonVariant;
  readonly size: ButtonSize;
}

/** Options for generating {@link Button} classes without rendering it. */
export interface ButtonVariantOptions {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly className?: string;
}

type PrimitiveRenderCallback = Exclude<ButtonPrimitive.Props["render"], React.ReactElement | undefined>;

/**
 * Readonly Base UI button props with visual presets and legacy slot compatibility.
 */
export type ButtonProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof ButtonPrimitive>, "render" | "className"> & {
    /**
     * Visual style variant.
     * @default "default"
     */
    variant?: ButtonVariant;
    /**
     * Size preset.
     * @default "default"
     */
    size?: ButtonSize;
    /**
     * Additional CSS classes merged with the button styles.
     * @default undefined
     */
    className?: string;
    /**
     * Custom element or render callback used to replace the default `<button>`.
     * @default undefined
     */
    render?: React.ReactElement | ((props: Parameters<PrimitiveRenderCallback>[0], state: ButtonState) => React.ReactElement);
    /**
     * Backward-compatible child-slot API.
     * Converts a single child element to `render`, inferring native behavior for
     * intrinsic elements only. Custom components can specify `nativeButton`.
     * @default false
     */
    asChild?: boolean;
  }
>;

/**
 * Builds the composed class list for the shared button component.
 */
function buttonVariants({variant = "default", size = "default", className}: Readonly<ButtonVariantOptions> = {}): string {
  return cn(styles.button, variantStyles[variant], sizeStyles[size], className);
}

/**
 * A button component that triggers actions.
 * Base UI owns rendering, refs, keyboard activation, focus, and disabled behavior.
 *
 * @remarks
 * Renders a native `<button>` by default. Use the `render` prop to compose the
 * button styles and shared behavior with other elements or components. The
 * deprecated `asChild` prop is still supported for backward compatibility.
 * Set `nativeButton={false}` when canonical `render` replaces the button with
 * a non-button element, including links. The public ref targets `HTMLElement`
 * so non-native render targets are represented accurately.
 *
 * @example
 * ```tsx
 * <Button variant="default" size="sm">Click me</Button>
 * <Button nativeButton={false} render={<a href="/dashboard" />}>Go to dashboard</Button>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/button | Base UI Button}
 */
const Button = React.forwardRef<HTMLElement, Button.Props>((props: Readonly<Button.Props>, ref): React.ReactElement => {
  const {render, asChild = false, variant = "default", size = "default", nativeButton, className, children, ...otherProps} = props;
  const legacyChild = asChild && React.isValidElement(children) && children.type !== React.Fragment ? children : undefined;
  const renderProp = legacyChild ?? render;

  return (
    <ButtonPrimitive
      data-slot='button'
      data-variant={variant}
      data-size={size}
      {...otherProps}
      ref={ref}
      nativeButton={nativeButton ?? (legacyChild ? legacyChild.type === "button" : true)}
      className={buttonVariants({variant, size, className})}
      render={typeof renderProp === "function" ? (elementProps, state) => renderProp(elementProps, {...state, variant, size}) : renderProp}>
      {legacyChild ? undefined : children}
    </ButtonPrimitive>
  );
});
Button.displayName = "Button";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Button {
  export type State = ButtonState;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = ButtonProps;
}

export {Button, buttonVariants};
