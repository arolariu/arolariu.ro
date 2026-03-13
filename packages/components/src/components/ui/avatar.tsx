"use client";

import {Avatar as BaseAvatar} from "@base-ui/react/avatar";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./avatar.module.css";

/**
 * Represents the configurable props for the Avatar root component.
 *
 * @remarks
 * Extends the Base UI avatar root primitive and exposes a class override for sizing,
 * rings, and layout adjustments.
 */
interface AvatarProps extends React.ComponentPropsWithoutRef<typeof BaseAvatar.Root> {
  /**
   * Additional CSS classes merged with the avatar root styles.
   */
  className?: string;
}

/**
 * Represents the configurable props for the AvatarImage component.
 *
 * @remarks
 * Extends the Base UI image primitive and exposes a class override for image-specific styling.
 */
interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof BaseAvatar.Image> {
  /**
   * Additional CSS classes merged with the avatar image styles.
   */
  className?: string;
}

/**
 * Represents the configurable props for the AvatarFallback component.
 *
 * @remarks
 * Extends the Base UI fallback primitive and exposes a class override for fallback content.
 */
interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof BaseAvatar.Fallback> {
  /**
   * Additional CSS classes merged with the avatar fallback styles.
   */
  className?: string;
}

/**
 * An avatar root for rendering profile images with accessible fallbacks.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI avatar root primitive and provides the structural container for
 * {@link AvatarImage} and {@link AvatarFallback}. Use it for users, teams, or brands.
 *
 * @example
 * ```tsx
 * <Avatar>
 *   <AvatarImage src="/users/alex.png" alt="Alex Olariu" />
 *   <AvatarFallback>AO</AvatarFallback>
 * </Avatar>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/avatar Base UI Avatar docs}
 */
const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(({className, ...props}, ref) => (
  <BaseAvatar.Root
    ref={ref}
    className={cn(styles.root, className)}
    {...props}
  />
));
Avatar.displayName = "Avatar";

/**
 * The image slot displayed when avatar media loads successfully.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI avatar image primitive and applies object-fit styles so profile
 * imagery fills the avatar frame cleanly.
 *
 * @example
 * ```tsx
 * <AvatarImage src={user.imageUrl} alt={user.name} />
 * ```
 *
 * @see {@link AvatarFallback}
 * @see {@link https://base-ui.com/react/components/avatar Base UI Avatar docs}
 */
const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(({className, ...props}, ref) => (
  <BaseAvatar.Image
    ref={ref}
    className={cn(styles.image, className)}
    {...props}
  />
));
AvatarImage.displayName = "AvatarImage";

/**
 * The fallback slot shown when avatar media is missing or fails to load.
 *
 * @remarks
 * **Rendering Context**: Client Component.
 *
 * Wraps the Base UI avatar fallback primitive and applies centered typography for
 * initials, icons, or other compact fallback content.
 *
 * @example
 * ```tsx
 * <AvatarFallback>AO</AvatarFallback>
 * ```
 *
 * @see {@link AvatarImage}
 * @see {@link https://base-ui.com/react/components/avatar Base UI Avatar docs}
 */
const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(({className, ...props}, ref) => (
  <BaseAvatar.Fallback
    ref={ref}
    className={cn(styles.fallback, className)}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

export {Avatar, AvatarFallback, AvatarImage};
