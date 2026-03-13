"use client";

import {Avatar as BaseAvatar} from "@base-ui/react/avatar";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./avatar.module.css";

const Avatar = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<typeof BaseAvatar.Root>>(({className, ...props}, ref) => (
  <BaseAvatar.Root
    ref={ref}
    className={cn(styles.root, className)}
    {...props}
  />
));
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<HTMLImageElement, React.ComponentPropsWithoutRef<typeof BaseAvatar.Image>>(
  ({className, ...props}, ref) => (
    <BaseAvatar.Image
      ref={ref}
      className={cn(styles.image, className)}
      {...props}
    />
  ),
);
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<typeof BaseAvatar.Fallback>>(
  ({className, ...props}, ref) => (
    <BaseAvatar.Fallback
      ref={ref}
      className={cn(styles.fallback, className)}
      {...props}
    />
  ),
);
AvatarFallback.displayName = "AvatarFallback";

export {Avatar, AvatarFallback, AvatarImage};
