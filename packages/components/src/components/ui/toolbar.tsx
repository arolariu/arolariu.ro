"use client";

import {Toolbar as BaseToolbar} from "@base-ui/react/toolbar";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./toolbar.module.css";

/**
 * Arranges related actions into a keyboard-accessible toolbar.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on Base UI Toolbar primitives
 * - Supports roving focus and compound toolbar item composition
 *
 * @example
 * ```tsx
 * <Toolbar aria-label='Text formatting'>
 *   <ToolbarButton>Bold</ToolbarButton>
 *   <ToolbarButton>Italic</ToolbarButton>
 * </Toolbar>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toolbar | Base UI Toolbar Docs}
 */
const Toolbar = React.forwardRef<HTMLDivElement, Toolbar.Props>((props: Readonly<Toolbar.Props>, forwardedRef): React.ReactElement => {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseToolbar.Root
      {...otherProps}
      ref={forwardedRef}
      render={render}
      className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}>
      {children}
    </BaseToolbar.Root>
  );
});

/**
 * Renders an interactive button within a toolbar.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Built on Base UI Toolbar button behavior
 * - Applies shared toolbar item spacing and focus styling
 *
 * @example
 * ```tsx
 * <ToolbarButton aria-label='Bold'>B</ToolbarButton>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toolbar | Base UI Toolbar Docs}
 */
const ToolbarButton = React.forwardRef<HTMLButtonElement, ToolbarButton.Props>(
  (props: Readonly<ToolbarButton.Props>, forwardedRef): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseToolbar.Button
        {...otherProps}
        ref={forwardedRef}
        render={render}
        className={(state) => cn(styles.item, styles.button, typeof className === "function" ? className(state) : className)}>
        {children}
      </BaseToolbar.Button>
    );
  },
);

/**
 * Groups related toolbar controls into a single visual cluster.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on Base UI Toolbar grouping primitives
 *
 * @example
 * ```tsx
 * <ToolbarGroup>
 *   <ToolbarButton>Left</ToolbarButton>
 *   <ToolbarButton>Center</ToolbarButton>
 * </ToolbarGroup>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toolbar | Base UI Toolbar Docs}
 */
const ToolbarGroup = React.forwardRef<HTMLDivElement, ToolbarGroup.Props>(
  (props: Readonly<ToolbarGroup.Props>, forwardedRef): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseToolbar.Group
        {...otherProps}
        ref={forwardedRef}
        render={render}
        className={(state) => cn(styles.group, typeof className === "function" ? className(state) : className)}>
        {children}
      </BaseToolbar.Group>
    );
  },
);

/**
 * Renders a visual separator between toolbar items or groups.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Built on Base UI Toolbar separator primitives
 *
 * @example
 * ```tsx
 * <ToolbarSeparator />
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toolbar | Base UI Toolbar Docs}
 */
const ToolbarSeparator = React.forwardRef<HTMLDivElement, ToolbarSeparator.Props>(
  (props: Readonly<ToolbarSeparator.Props>, forwardedRef): React.ReactElement => {
    const {className, render, ...otherProps} = props;

    return (
      <BaseToolbar.Separator
        {...otherProps}
        ref={forwardedRef}
        render={render}
        className={(state) => cn(styles.separator, typeof className === "function" ? className(state) : className)}
      />
    );
  },
);

/**
 * Renders a link that visually matches toolbar buttons.
 *
 * @remarks
 * - Renders an `<a>` element by default
 * - Built on Base UI Toolbar link primitives
 *
 * @example
 * ```tsx
 * <ToolbarLink href='/docs'>Docs</ToolbarLink>
 * ```
 *
 * @see {@link https://base-ui.com/react/components/toolbar | Base UI Toolbar Docs}
 */
const ToolbarLink = React.forwardRef<HTMLAnchorElement, ToolbarLink.Props>(
  (props: Readonly<ToolbarLink.Props>, forwardedRef): React.ReactElement => {
    const {className, children, render, ...otherProps} = props;

    return (
      <BaseToolbar.Link
        {...otherProps}
        ref={forwardedRef}
        render={render}
        className={(state) => cn(styles.item, styles.link, typeof className === "function" ? className(state) : className)}>
        {children}
      </BaseToolbar.Link>
    );
  },
);

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Toolbar {
  export type Props = React.ComponentPropsWithRef<typeof BaseToolbar.Root>;
  export type State = BaseToolbar.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToolbarButton {
  export type Props = React.ComponentPropsWithRef<typeof BaseToolbar.Button>;
  export type State = BaseToolbar.Button.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToolbarGroup {
  export type Props = React.ComponentPropsWithRef<typeof BaseToolbar.Group>;
  export type State = BaseToolbar.Group.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToolbarSeparator {
  export type Props = React.ComponentPropsWithRef<typeof BaseToolbar.Separator>;
  export type State = BaseToolbar.Separator.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToolbarLink {
  export type Props = React.ComponentPropsWithRef<typeof BaseToolbar.Link>;
  export type State = BaseToolbar.Link.State;
}

/** Props for the keyboard-accessible toolbar root. */
export type ToolbarProps = React.ComponentPropsWithRef<typeof BaseToolbar.Root>;
/** Primitive-owned toolbar orientation and disabled state. */
export type ToolbarState = BaseToolbar.Root.State;
/** Props for a toolbar button, including native/render composition and DOM refs. */
export type ToolbarButtonProps = React.ComponentPropsWithRef<typeof BaseToolbar.Button>;
/** Primitive-owned toolbar button state. */
export type ToolbarButtonState = BaseToolbar.Button.State;
/** Props for a toolbar control group. */
export type ToolbarGroupProps = React.ComponentPropsWithRef<typeof BaseToolbar.Group>;
/** Primitive-owned toolbar group state. */
export type ToolbarGroupState = BaseToolbar.Group.State;
/** Props for the toolbar separator. */
export type ToolbarSeparatorProps = React.ComponentPropsWithRef<typeof BaseToolbar.Separator>;
/** Primitive-owned separator orientation state. */
export type ToolbarSeparatorState = BaseToolbar.Separator.State;
/** Props for a native toolbar link. */
export type ToolbarLinkProps = React.ComponentPropsWithRef<typeof BaseToolbar.Link>;
/** Primitive-owned toolbar link orientation state. */
export type ToolbarLinkState = BaseToolbar.Link.State;

Toolbar.displayName = "Toolbar";
ToolbarButton.displayName = "ToolbarButton";
ToolbarGroup.displayName = "ToolbarGroup";
ToolbarSeparator.displayName = "ToolbarSeparator";
ToolbarLink.displayName = "ToolbarLink";

export {Toolbar, ToolbarButton, ToolbarGroup, ToolbarLink, ToolbarSeparator};
