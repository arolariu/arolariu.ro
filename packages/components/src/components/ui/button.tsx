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
       * The target must be able to take button semantics; do not render links (`<a href>`) through Button.
       * @default undefined
       */
      render?: React.ReactElement | ((props: Parameters<PrimitiveRenderCallback>[0], state: ButtonState) => React.ReactElement);
    }
>;

/**
 * Builds the composed class list for the shared button component.
 *
 * @remarks
 * Use this helper to give a native link the button appearance. A link must stay an `<a href>`
 * element so assistive technology announces it as a link and lists it with the page's links,
 * and so it follows only on Enter (not Space); style the anchor directly instead of rendering
 * it through {@link Button}. With `variant: "link"`, a real link keeps an underline at rest as a
 * non-colour cue (WCAG 1.4.1), while `<Button variant="link">` underlines only on hover; the other
 * variants never underline. The helper is exported from this client module, so call it from a
 * Client Component; Server Components cannot invoke it.
 *
 * @param options - Variant, size and extra classes used to derive the class string.
 * @returns The merged class name string for the requested variant and size.
 *
 * @example
 * ```tsx
 * <a href="/dashboard" className={buttonVariants({variant: "outline", size: "sm"})}>
 *   Go to dashboard
 * </a>
 * ```
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
 *
 * Button always exposes button semantics, so it is for actions, not navigation.
 * Render a link as a native `<a href>` styled with {@link buttonVariants} instead:
 * rendered through Button, a link is announced as a button, is missing from the
 * page's list of links, and activates on Space.
 * Set `nativeButton={false}` only when canonical `render` replaces the button with a
 * non-link element that can take button semantics (for example a `<div>` or `<span>`);
 * Base UI then adds `role="button"`, focusability and Enter/Space activation. The
 * public ref targets `HTMLElement` so non-native render targets are represented accurately.
 *
 * @example
 * ```tsx
 * <Button variant="default" size="sm">Click me</Button>
 * <Button nativeButton={false} render={<div />}>Run task</Button>
 * <a href="/dashboard" className={buttonVariants({variant: "outline"})}>Go to dashboard</a>
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
