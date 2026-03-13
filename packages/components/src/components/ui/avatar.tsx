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
  /** Additional CSS classes merged with the avatar root styles. */
  className?: string;
}

/**
 * Props for the shared avatar image.
 */
interface AvatarImageProps extends Omit<React.ComponentPropsWithRef<typeof BaseAvatar.Image>, "className"> {
  /** Additional CSS classes merged with the avatar image styles. */
  className?: string;
}

/**
 * Props for the shared avatar fallback.
 */
interface AvatarFallbackProps extends Omit<React.ComponentPropsWithRef<typeof BaseAvatar.Fallback>, "className"> {
  /** Additional CSS classes merged with the avatar fallback styles. */
  className?: string;
}

/**
 * Renders the avatar root with shared layout styling.
 */
function Avatar(props: Readonly<Avatar.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseAvatar.Root
      {...otherProps}
      render={useRender({
        defaultTagName: "span",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      {children}
    </BaseAvatar.Root>
  );
}

/**
 * Renders the avatar image slot.
 */
function AvatarImage(props: Readonly<AvatarImage.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseAvatar.Image
      {...otherProps}
      render={useRender({
        defaultTagName: "img",
        render: render as never,
        props: mergeProps({className: cn(styles.image, className)}, {}),
      })}
    />
  );
}

/**
 * Renders the avatar fallback slot.
 */
function AvatarFallback(props: Readonly<AvatarFallback.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseAvatar.Fallback
      {...otherProps}
      render={useRender({
        defaultTagName: "span",
        render: render as never,
        props: mergeProps({className: cn(styles.fallback, className)}, {}),
      })}>
      {children}
    </BaseAvatar.Fallback>
  );
}

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
