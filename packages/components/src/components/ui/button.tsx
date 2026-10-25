"use client";

import {Button as ButtonPrimitive} from "@base-ui/react/button";
import * as React from "react";

import {buttonVariants} from "./_button-variants";

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

/**
 * Options for generating {@link Button} classes without rendering it.
 *
 * @remarks
 * Accepted by {@link buttonVariants}. Every member is optional, so `buttonVariants()` returns the classes of a
 * default-variant, default-size button.
 *
 * @example
 * ```tsx
 * const options: ButtonVariantOptions = {variant: "outline", size: "sm"};
 * const className = buttonVariants(options);
 * ```
 */
export interface ButtonVariantOptions {
  /**
   * Visual treatment. On a real link, `"link"` keeps an underline at rest; the other variants never underline.
   *
   * @default "default"
   */
  readonly variant?: ButtonVariant;
  /**
   * Size preset. The `icon*` sizes are for icon-only controls, which still need an accessible name of their own.
   *
   * @default "default"
   */
  readonly size?: ButtonSize;
  /**
   * Additional CSS classes merged after the generated classes.
   *
   * @default undefined
   */
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
 * page's list of links, and activates on Space. Imported from the package root,
 * `buttonVariants` is also callable from Server Components.
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
