"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
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
  sm: styles.sizeSm!,
  lg: styles.sizeLg!,
  icon: styles.sizeIcon!,
};

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "sm" | "lg" | "icon";

/**
 * Serializable button state exposed to Base UI render callbacks.
 */
export interface ButtonState extends Record<string, unknown> {
  variant: ButtonVariant;
  size: ButtonSize;
  disabled: boolean;
}

interface ButtonVariantOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * Props for the shared button component.
 */
export interface ButtonProps extends Omit<React.ComponentPropsWithRef<"button">, "children" | "className" | "disabled"> {
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
   * Whether the button should ignore user interaction.
   * @default false
   */
  disabled?: boolean;
  /**
   * Additional CSS classes merged with the button styles.
   * @default undefined
   */
  className?: string;
  /**
   * Custom element or render callback used to replace the default `<button>`.
   * @default undefined
   */
  render?: useRender.RenderProp<ButtonState>;
  /**
   * Backward-compatible child-slot API.
   * Converts the single child element to the `render` prop internally.
   * @default false
   */
  asChild?: boolean;
  /**
   * Button contents when `render` is not provided.
   * @default undefined
   */
  children?: React.ReactNode;
}

/**
 * Builds the composed class list for the shared button component.
 */
function buttonVariants({variant = "default", size = "default", className}: Readonly<ButtonVariantOptions> = {}): string {
  return cn(styles.button, variantStyles[variant], sizeStyles[size], className);
}

function isIntrinsicButtonElement(renderProp: ButtonProps["render"]): boolean {
  return React.isValidElement(renderProp) && typeof renderProp.type === "string" && renderProp.type === "button";
}

function createNonNativeInteractionProps(disabled: boolean): React.HTMLAttributes<HTMLElement> {
  return {
    "aria-disabled": disabled || undefined,
    role: "button",
    tabIndex: disabled ? -1 : undefined,
    onClick(event) {
      if (!disabled) {
        return;
      }

      event.preventDefault();

      if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") {
        event.preventBaseUIHandler();
      }
    },
    onKeyDown(event) {
      if (!disabled || (event.key !== "Enter" && event.key !== " ")) {
        return;
      }

      event.preventDefault();

      if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") {
        event.preventBaseUIHandler();
      }
    },
  };
}

/**
 * A button component that triggers actions.
 * Built with Base UI's canonical `useRender` + `mergeProps` composition pattern.
 *
 * @remarks
 * Renders a native `<button>` by default. Use the `render` prop to compose the
 * button styles and shared behavior with other elements or components. The
 * deprecated `asChild` prop is still supported and internally converted to
 * `render` for backward compatibility.
 *
 * @example
 * ```tsx
 * <Button variant="default" size="sm">Click me</Button>
 * <Button render={<a href="/dashboard" />}>Go to dashboard</Button>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/button | Base UI Button}
 */
const Button = React.forwardRef<HTMLButtonElement, Button.Props>((props: Readonly<Button.Props>, ref): React.ReactElement => {
  const {render, asChild = false, variant = "default", size = "default", disabled = false, className, children, ...otherProps} = props;

  const state: Button.State = {variant, size, disabled};
  const composedClassName = buttonVariants({variant, size, className});
  const renderProp = asChild && React.isValidElement(children) ? children : render;
  const shouldRenderNativeButton = !renderProp || isIntrinsicButtonElement(renderProp);
  const typeProps: Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> = shouldRenderNativeButton ? {type: "button"} : {};
  const interactionProps = shouldRenderNativeButton ? {disabled} : createNonNativeInteractionProps(disabled);

  return useRender<Button.State, HTMLButtonElement>({
    defaultTagName: "button",
    ref,
    render: renderProp,
    state,
    props: mergeProps<"button">({className: composedClassName}, typeProps, otherProps, interactionProps, {
      children: renderProp ? undefined : children,
    }),
  });
});
Button.displayName = "Button";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Button {
  export type State = ButtonState;
  export type Props = ButtonProps;
}

export {Button, buttonVariants};
