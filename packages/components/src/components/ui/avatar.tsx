"use client";

import {Avatar as BaseAvatar} from "@base-ui/react/avatar";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./avatar.module.css";

/**
 * Props for the shared avatar root.
 */
interface AvatarProps extends Omit<React.ComponentPropsWithRef<typeof BaseAvatar.Root>, "className"> {
  /** Additional CSS classes merged with the avatar root styles. @default undefined */
  className?: string;
}

/**
 * Props for the shared avatar image.
 */
interface AvatarImageProps extends Omit<React.ComponentPropsWithRef<typeof BaseAvatar.Image>, "className"> {
  /** Additional CSS classes merged with the avatar image styles. @default undefined */
  className?: string;
}

/**
 * Props for the shared avatar fallback.
 */
interface AvatarFallbackProps extends Omit<React.ComponentPropsWithRef<typeof BaseAvatar.Fallback>, "className"> {
  /** Additional CSS classes merged with the avatar fallback styles. @default undefined */
  className?: string;
}

/**
 * Displays a user avatar container with shared sizing and shape styles.
 *
 * @remarks
 * - Renders a `<span>` element by default
 * - Built on {@link https://base-ui.com/react/components/avatar | Base UI Avatar}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <Avatar>
 *   <AvatarImage src="/profile.png" alt="Profile" />
 *   <AvatarFallback>AO</AvatarFallback>
 * </Avatar>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/avatar | Base UI Documentation}
 */
const Avatar = React.forwardRef<HTMLSpanElement, Avatar.Props>(function Avatar(props, forwardedRef) {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseAvatar.Root
      {...otherProps}
      ref={forwardedRef}
      render={useRender({
        defaultTagName: "span",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      {children}
    </BaseAvatar.Root>
  );
});
Avatar.displayName = "Avatar";

/**
 * Renders the primary avatar image inside the avatar root.
 *
 * @remarks
 * - Renders an `<img>` element by default
 * - Built on {@link https://base-ui.com/react/components/avatar | Base UI Avatar}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AvatarImage src="/profile.png" alt="Profile" />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/avatar | Base UI Documentation}
 */
const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImage.Props>(function AvatarImage(props, forwardedRef) {
  const {className, render, ...otherProps} = props;

  return (
    <BaseAvatar.Image
      {...otherProps}
      ref={forwardedRef}
      render={useRender({
        defaultTagName: "img",
        render: render as never,
        props: mergeProps({className: cn(styles.image, className)}, {}),
      })}
    />
  );
});
AvatarImage.displayName = "AvatarImage";

/**
 * Renders fallback content when the avatar image is unavailable.
 *
 * @remarks
 * - Renders a `<span>` element by default
 * - Built on {@link https://base-ui.com/react/components/avatar | Base UI Avatar}
 * - Supports the `render` prop for element composition
 * - Styling via CSS Modules with `--ac-*` custom properties
 *
 * @example Basic usage
 * ```tsx
 * <AvatarFallback>AO</AvatarFallback>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/avatar | Base UI Documentation}
 */
const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallback.Props>(function AvatarFallback(props, forwardedRef) {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseAvatar.Fallback
      {...otherProps}
      ref={forwardedRef}
      render={useRender({
        defaultTagName: "span",
        render: render as never,
        props: mergeProps({className: cn(styles.fallback, className)}, {}),
      })}>
      {children}
    </BaseAvatar.Fallback>
  );
});
AvatarFallback.displayName = "AvatarFallback";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Avatar {
  export type Props = AvatarProps;
  export type State = BaseAvatar.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AvatarImage {
  export type Props = AvatarImageProps;
  export type State = BaseAvatar.Image.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AvatarFallback {
  export type Props = AvatarFallbackProps;
  export type State = BaseAvatar.Fallback.State;
}

export {Avatar, AvatarFallback, AvatarImage};
