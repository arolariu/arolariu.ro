"use client";

import {Avatar as BaseAvatar} from "@base-ui/react/avatar";
import {mergeProps} from "@base-ui/react/merge-props";
import type {HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./avatar.module.css";

/** Supported avatar size presets. */
export type AvatarSize = "sm" | "default" | "lg";

/** Primitive-owned image status augmented with the selected size. */
export interface AvatarState extends Readonly<BaseAvatar.Root.State> {
  readonly size: AvatarSize;
}

type RootRenderCallback = Exclude<BaseAvatar.Root.Props["render"], React.ReactElement | undefined>;

/** Readonly Base UI root props with shared visual sizing. */
export type AvatarProps = Readonly<
  Omit<React.ComponentPropsWithRef<typeof BaseAvatar.Root>, "className" | "render"> & {
    /** Avatar size preset. @default "default" */
    size?: AvatarSize;
    /** Additional classes or a callback receiving the actual root state. */
    className?: string | ((state: AvatarState) => string | undefined);
    /** Element or callback rendered by the owning Base UI root. */
    render?: React.ReactElement | ((props: Parameters<RootRenderCallback>[0], state: AvatarState) => React.ReactElement);
  }
>;

/** Primitive-owned image loading and transition state. */
export type AvatarImageState = Readonly<BaseAvatar.Image.State>;

/** Readonly Base UI image props, including its loading and render callbacks. */
export type AvatarImageProps = Readonly<React.ComponentPropsWithRef<typeof BaseAvatar.Image>>;

/** Primitive-owned fallback image loading state. */
export type AvatarFallbackState = Readonly<BaseAvatar.Fallback.State>;

/** Readonly Base UI fallback props, including its delay and render callbacks. */
export type AvatarFallbackProps = Readonly<React.ComponentPropsWithRef<typeof BaseAvatar.Fallback>>;

// Base UI merges input refs into a callback (or null) before invoking render.
type AvatarPartRenderProps = Readonly<
  Omit<HTMLProps<HTMLElement>, "ref"> & {
    ref?: React.RefCallback<HTMLElement> | null;
  }
>;

/** State owned by the native avatar badge renderer. */
export type AvatarBadgeState = Readonly<{slot: "avatar-badge"}>;

/** Native span props with Base UI render composition for the corner badge. */
export type AvatarBadgeProps = Readonly<
  Omit<useRender.ComponentProps<"span", AvatarBadgeState, AvatarPartRenderProps>, "ref"> & {
    /** Ref to the actual rendered element; the default target is a span. */
    ref?: React.Ref<HTMLElement>;
  }
>;

/** State owned by the native avatar group renderer. */
export type AvatarGroupState = Readonly<{slot: "avatar-group"}>;

/** Native div props with Base UI render composition for an avatar stack. */
export type AvatarGroupProps = Readonly<
  Omit<useRender.ComponentProps<"div", AvatarGroupState, AvatarPartRenderProps>, "ref"> & {
    /** Ref to the actual rendered element; the default target is a div. */
    ref?: React.Ref<HTMLElement>;
  }
>;

/** State owned by the native avatar group count renderer. */
export type AvatarGroupCountState = Readonly<{slot: "avatar-group-count"}>;

/** Native div props with Base UI render composition for remaining-avatar content. */
export type AvatarGroupCountProps = Readonly<
  Omit<useRender.ComponentProps<"div", AvatarGroupCountState, AvatarPartRenderProps>, "ref"> & {
    /** Ref to the actual rendered element; the default target is a div. */
    ref?: React.Ref<HTMLElement>;
  }
>;

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
const Avatar = React.forwardRef<HTMLSpanElement, Avatar.Props>((props: Readonly<Avatar.Props>, forwardedRef): React.ReactElement => {
  const {className, children, render, size = "default", ...otherProps} = props;

  return (
    <BaseAvatar.Root
      {...otherProps}
      data-slot='avatar'
      data-size={size}
      ref={forwardedRef}
      className={
        typeof className === "function"
          ? (state) => cn(styles.root, styles[size], className({...state, size}))
          : cn(styles.root, styles[size], className)
      }
      render={typeof render === "function" ? (elementProps, state) => render(elementProps, {...state, size}) : render}>
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
const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImage.Props>(
  (props: Readonly<AvatarImage.Props>, forwardedRef): React.ReactElement => {
    const {className, render, ...otherProps} = props;

    return (
      <BaseAvatar.Image
        {...otherProps}
        data-slot='avatar-image'
        ref={forwardedRef}
        className={typeof className === "function" ? (state) => cn(styles.image, className(state)) : cn(styles.image, className)}
        render={render}
      />
    );
  },
);
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
const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallback.Props>(
  (props: Readonly<AvatarFallback.Props>, forwardedRef): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseAvatar.Fallback
        {...otherProps}
        data-slot='avatar-fallback'
        ref={forwardedRef}
        className={typeof className === "function" ? (state) => cn(styles.fallback, className(state)) : cn(styles.fallback, className)}
        render={render}>
        {children}
      </BaseAvatar.Fallback>
    );
  },
);
AvatarFallback.displayName = "AvatarFallback";

/**
 * Places caller-provided status content at an avatar's bottom inline-end corner.
 *
 * @remarks
 * Place directly inside {@link Avatar}; its size follows the root preset.
 * Icons are hidden at `sm`, leaving a compact dot. Supply an accessible label
 * for meaningful status, or `aria-hidden` for a purely decorative badge.
 * Composed targets accept their corresponding DOM refs; callback props carry
 * Base UI's merged callback ref rather than a default-span object ref.
 */
const AvatarBadge = React.forwardRef<HTMLElement, AvatarBadge.Props>(
  (props: Readonly<React.PropsWithoutRef<AvatarBadge.Props>>, ref): React.ReactElement => {
    const {className, render, ...otherProps} = props;
    return useRender<AvatarBadge.State, HTMLElement>({
      defaultTagName: "span",
      ref,
      render,
      state: {slot: "avatar-badge"},
      props: mergeProps<"span">({className: cn(styles.badge, className)}, otherProps),
    });
  },
);
AvatarBadge.displayName = "AvatarBadge";

/**
 * Displays directly nested avatars and an optional trailing {@link AvatarGroupCount}.
 *
 * @remarks
 * The stack uses logical overlap for LTR/RTL and keeps badge-bearing avatars
 * above unbadged peers. Supply `role="group"` and a label when the collection
 * needs a group name; the default native div adds no redundant ARIA.
 * The common `HTMLElement` ref boundary supports the actual composed target.
 */
const AvatarGroup = React.forwardRef<HTMLElement, AvatarGroup.Props>(
  (props: Readonly<React.PropsWithoutRef<AvatarGroup.Props>>, ref): React.ReactElement => {
    const {className, render, ...otherProps} = props;
    return useRender<AvatarGroup.State, HTMLElement>({
      defaultTagName: "div",
      ref,
      render,
      state: {slot: "avatar-group"},
      props: mergeProps<"div">({className: cn(styles.group, className)}, otherProps),
    });
  },
);
AvatarGroup.displayName = "AvatarGroup";

/**
 * Displays caller-provided remaining-avatar content, such as `+3`.
 *
 * @remarks
 * A trailing count matches the first direct avatar's `sm`/`default`/`lg` size.
 * Mixed-size groups deliberately use the first avatar as the sizing reference.
 * Outside a group it uses the default size. Provide a descriptive accessible
 * label when a number alone does not explain the remaining items.
 * Composed targets accept their corresponding DOM refs through `HTMLElement`.
 */
const AvatarGroupCount = React.forwardRef<HTMLElement, AvatarGroupCount.Props>(
  (props: Readonly<React.PropsWithoutRef<AvatarGroupCount.Props>>, ref): React.ReactElement => {
    const {className, render, ...otherProps} = props;
    return useRender<AvatarGroupCount.State, HTMLElement>({
      defaultTagName: "div",
      ref,
      render,
      state: {slot: "avatar-group-count"},
      props: mergeProps<"div">({className: cn(styles.groupCount, className)}, otherProps),
    });
  },
);
AvatarGroupCount.displayName = "AvatarGroupCount";

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Avatar {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = AvatarProps;
  export type State = AvatarState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AvatarImage {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = AvatarImageProps;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type State = AvatarImageState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AvatarFallback {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = AvatarFallbackProps;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type State = AvatarFallbackState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AvatarBadge {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = AvatarBadgeProps;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type State = AvatarBadgeState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AvatarGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = AvatarGroupProps;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type State = AvatarGroupState;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace AvatarGroupCount {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type Props = AvatarGroupCountProps;
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- public namespace alias preserves the canonical component typing API
  export type State = AvatarGroupCountState;
}

export {Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage};
