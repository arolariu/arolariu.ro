"use client";

import {mergeProps} from "@base-ui/react/merge-props";
import {Toolbar as BaseToolbar} from "@base-ui/react/toolbar";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./toolbar.module.css";

type ToolbarProps = React.ComponentPropsWithRef<typeof BaseToolbar.Root>;
type ToolbarButtonProps = React.ComponentPropsWithRef<typeof BaseToolbar.Button>;
type ToolbarGroupProps = React.ComponentPropsWithRef<typeof BaseToolbar.Group>;
type ToolbarSeparatorProps = React.ComponentPropsWithRef<typeof BaseToolbar.Separator>;
type ToolbarLinkProps = React.ComponentPropsWithRef<typeof BaseToolbar.Link>;

/**
 * Renders the toolbar root.
 */
function Toolbar(props: Readonly<Toolbar.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseToolbar.Root
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.root, className)}, {}),
      })}>
      {children}
    </BaseToolbar.Root>
  );
}

/**
 * Renders a compact interactive toolbar button.
 */
function ToolbarButton(props: Readonly<ToolbarButton.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseToolbar.Button
      {...otherProps}
      render={useRender({
        defaultTagName: "button",
        render: render as never,
        props: mergeProps({className: cn(styles.item, styles.button, className)}, {}),
      })}>
      {children}
    </BaseToolbar.Button>
  );
}

/**
 * Renders a toolbar item group.
 */
function ToolbarGroup(props: Readonly<ToolbarGroup.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseToolbar.Group
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.group, className)}, {}),
      })}>
      {children}
    </BaseToolbar.Group>
  );
}

/**
 * Renders a separator between toolbar items.
 */
function ToolbarSeparator(props: Readonly<ToolbarSeparator.Props>): React.ReactElement {
  const {className, render, ...otherProps} = props;

  return (
    <BaseToolbar.Separator
      {...otherProps}
      render={useRender({
        defaultTagName: "div",
        render: render as never,
        props: mergeProps({className: cn(styles.separator, className)}, {}),
      })}
    />
  );
}

/**
 * Renders a toolbar link with button-like affordances.
 */
function ToolbarLink(props: Readonly<ToolbarLink.Props>): React.ReactElement {
  const {className, children, render, ...otherProps} = props;

  return (
    <BaseToolbar.Link
      {...otherProps}
      render={useRender({
        defaultTagName: "a",
        render: render as never,
        props: mergeProps({className: cn(styles.item, styles.link, className)}, {}),
      })}>
      {children}
    </BaseToolbar.Link>
  );
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace Toolbar {
  export type Props = ToolbarProps;
  export type State = BaseToolbar.Root.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToolbarButton {
  export type Props = ToolbarButtonProps;
  export type State = BaseToolbar.Button.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToolbarGroup {
  export type Props = ToolbarGroupProps;
  export type State = BaseToolbar.Group.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToolbarSeparator {
  export type Props = ToolbarSeparatorProps;
  export type State = BaseToolbar.Separator.State;
}

// eslint-disable-next-line no-redeclare -- required for the canonical component namespace typing API
namespace ToolbarLink {
  export type Props = ToolbarLinkProps;
  export type State = BaseToolbar.Link.State;
}

export {Toolbar, ToolbarButton, ToolbarGroup, ToolbarLink, ToolbarSeparator};
