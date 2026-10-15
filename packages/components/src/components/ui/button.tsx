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
type IconButtonSize = Extract<ButtonSize, `icon${string}`>;
type ButtonNamingProps =
  | {readonly size?: Exclude<ButtonSize, IconButtonSize>}
  | {readonly size?: ButtonSize; readonly "aria-label": string}
  | {readonly size?: ButtonSize; readonly "aria-labelledby": string};

/**
 * Readonly Base UI button props with visual presets and render composition.
 */
export type ButtonProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof ButtonPrimitive>, "render" | "className">
    & ButtonNamingProps & {
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
 * button styles and shared behavior with other elements or components.
 * Icon-only content must have an action-specific accessible name supplied
 * through `aria-label` or `aria-labelledby`.
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
const Button = (props: Readonly<Button.Props>): React.ReactElement => {
  const {ref, render, variant = "default", size = "default", nativeButton, className, children, ...otherProps} = props;

  return (
    <ButtonPrimitive
      data-slot='button'
      data-variant={variant}
      data-size={size}
      ref={ref}
      nativeButton={nativeButton}
      className={buttonVariants({variant, size, className})}
      render={typeof render === "function" ? (elementProps, state) => render(elementProps, {...state, variant, size}) : render}
      {...otherProps}>
      {children}
    </ButtonPrimitive>
  );
};
Button.displayName = "Button";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Button {
  export type State = ButtonState;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = ButtonProps;
}

export {Button, buttonVariants};
