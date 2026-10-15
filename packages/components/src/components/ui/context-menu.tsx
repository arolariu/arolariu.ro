"use client";

import {ContextMenu as BaseContextMenu} from "@base-ui/react/context-menu";
import {useDirection} from "@base-ui/react/direction-provider";
import type {ComponentRenderFn, HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSubTrigger,
} from "./dropdown-menu";
import styles from "./context-menu.module.css";

/** Primitive context-menu state options. */
export type ContextMenuProps = Readonly<BaseContextMenu.Root.Props>;
/** Accessible group props from the actual ContextMenu alias. */
export type ContextMenuGroupProps = Readonly<React.ComponentPropsWithRef<typeof BaseContextMenu.Group>>;
/** Portal props from the actual ContextMenu alias. */
export type ContextMenuPortalProps = Readonly<React.ComponentPropsWithRef<typeof BaseContextMenu.Portal>>;
/** Native radio-group values and event details from the actual ContextMenu alias. */
export type ContextMenuRadioGroupProps = Readonly<React.ComponentPropsWithRef<typeof BaseContextMenu.RadioGroup>>;
/** Native ContextMenu submenu-root props. */
export type ContextMenuSubProps = Readonly<BaseContextMenu.SubmenuRoot.Props>;
/** Primitive trigger props and render composition. */
export type ContextMenuTriggerProps = Readonly<React.ComponentPropsWithRef<typeof BaseContextMenu.Trigger>>;
type ContextMenuPositioningProps = Omit<BaseContextMenu.Positioner.Props, keyof BaseContextMenu.Popup.Props | "positionMethod">;
type MenuDataAttributes = {readonly [key: `data-${string}`]: string | number | boolean | undefined};
/** Popup DOM/state props and separate primitive-derived placement options. */
export type ContextMenuContentProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseContextMenu.Popup>
    & ContextMenuPositioningProps & {
      /** Positioner DOM, ref, render and state-class props; placement stays at the top level. */
      positionerProps?: Readonly<
        Omit<
          React.ComponentPropsWithRef<typeof BaseContextMenu.Positioner>,
          keyof ContextMenuPositioningProps | "children" | "positionMethod"
        >
          & MenuDataAttributes
      >;
      /** Portal options. Nested modal menus should target the enclosing primitive Portal, not an external sibling. */
      portalProps?: Readonly<Omit<React.ComponentPropsWithRef<typeof BaseContextMenu.Portal>, "children"> & MenuDataAttributes>;
    }
>;
/** ContextMenu.Item is the same installed primitive as Menu.Item. */
export type ContextMenuItemProps = DropdownMenuItem.Props;
/** Native checkbox props with optional inset. */
export type ContextMenuCheckboxItemProps = DropdownMenuCheckboxItem.Props;
/** Native radio props with optional inset. */
export type ContextMenuRadioItemProps = DropdownMenuRadioItem.Props;
/** Primitive submenu trigger props with optional inset. */
export type ContextMenuSubTriggerProps = DropdownMenuSubTrigger.Props;
/** Primitive group-label props with optional inset. */
export type ContextMenuLabelProps = DropdownMenuLabel.Props;
/** Primitive separator props. */
export type ContextMenuSeparatorProps = DropdownMenuSeparator.Props;
/** Presentation-only shortcut props. */
export type ContextMenuShortcutProps = DropdownMenuShortcut.Props;

function withContextChildren<State>(
  render: React.ReactElement | ComponentRenderFn<HTMLProps, State> | undefined,
  children: React.ReactNode,
): React.ReactElement | ComponentRenderFn<HTMLProps, State> | undefined {
  if (render === undefined || typeof render === "function" || children === undefined) return render;
  return function renderContextElement(elementProps): React.ReactElement {
    return (
      <ContextElement
        render={render}
        elementProps={elementProps}>
        {children}
      </ContextElement>
    );
  };
}

function ContextElement({
  render,
  elementProps,
  children,
}: Readonly<{render: React.ReactElement; elementProps: HTMLProps; children: React.ReactNode}>): React.ReactElement {
  // eslint-disable-next-line react-x/no-children-to-array -- Resolve Flight-lazy elements through React's public children boundary.
  const [element] = React.Children.toArray(render);
  // eslint-disable-next-line react-x/no-clone-element -- Replace only compound children; ContextMenu owns state, ref and event merging.
  const decorated = React.isValidElement<{children?: React.ReactNode}>(element) ? React.cloneElement(element, {children}) : render;
  return useRender({render: decorated, props: {...elementProps}});
}

/** Coordinates the real pointer/long-press context menu without adding a DOM wrapper. */
function ContextMenu(props: Readonly<ContextMenu.Props>): React.ReactElement {
  return <BaseContextMenu.Root {...props} />;
}
/** Provides accessible primitive group semantics. */
const ContextMenuGroup = BaseContextMenu.Group;
/** Hosts content in the primitive portal. */
const ContextMenuPortal = BaseContextMenu.Portal;
/** Preserves native values, null selection and cancellable radio change details. */
const ContextMenuRadioGroup = BaseContextMenu.RadioGroup;
/** Coordinates native submenu keyboard and focus behavior. */
const ContextMenuSub = BaseContextMenu.SubmenuRoot;

/** Opens the context menu at the pointer; render callbacks run only inside the primitive. */
const ContextMenuTrigger = ({ref, ...props}: Readonly<ContextMenuTrigger.Props>): React.ReactElement => {
  const {children, render, className, ...otherProps} = props;
  return (
    <BaseContextMenu.Trigger
      data-slot='context-menu-trigger'
      ref={ref}
      className={(state) => cn(styles.control, typeof className === "function" ? className(state) : className)}
      render={withContextChildren(render, children)}
      {...otherProps}>
      {children}
    </BaseContextMenu.Trigger>
  );
};
ContextMenuTrigger.displayName = "ContextMenuTrigger";

/**
 * Portals the role-bearing Popup with canonical right/start placement and offsets 0/4.
 * Popup names, events, ref, finalFocus and render/class callbacks remain on Popup.
 */
const ContextMenuContent = ({ref, ...props}: Readonly<ContextMenuContent.Props>): React.ReactElement => {
  const direction = useDirection();
  const {
    align = "start",
    alignOffset = 4,
    side = "right",
    sideOffset = 0,
    anchor,
    collisionBoundary,
    collisionPadding,
    sticky,
    arrowPadding,
    disableAnchorTracking,
    collisionAvoidance,
    positionerProps,
    portalProps,
    className,
    dir = direction,
    children,
    render,
    ...popupProps
  } = props;
  const {className: positionerClassName, render: positionerRender, ...positionerNativeProps} = positionerProps ?? {};
  const {render: portalRender, ...portalNativeProps} = portalProps ?? {};
  const popup = (
    <BaseContextMenu.Popup
      data-slot='context-menu-content'
      ref={ref}
      dir={dir}
      render={withContextChildren(render, children)}
      className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}
      {...popupProps}>
      {children}
    </BaseContextMenu.Popup>
  );
  const positioner = (
    <BaseContextMenu.Positioner
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      anchor={anchor}
      collisionBoundary={collisionBoundary}
      collisionPadding={collisionPadding}
      sticky={sticky}
      arrowPadding={arrowPadding}
      disableAnchorTracking={disableAnchorTracking}
      collisionAvoidance={collisionAvoidance}
      render={withContextChildren(positionerRender, popup)}
      className={(state) =>
        cn(styles.positioner, typeof positionerClassName === "function" ? positionerClassName(state) : positionerClassName)
      }
      {...positionerNativeProps}>
      {popup}
    </BaseContextMenu.Positioner>
  );
  return (
    <ContextMenuPortal
      render={withContextChildren(portalRender, null)}
      {...portalNativeProps}>
      {positioner}
    </ContextMenuPortal>
  );
};
ContextMenuContent.displayName = "ContextMenuContent";

/** Portaled submenu using inline-end (right in LTR), start alignment and offsets 0/4. */
function ContextMenuSubContent(props: Readonly<ContextMenuSubContent.Props>): React.ReactElement {
  const {side = "inline-end", ...otherProps} = props;
  return (
    <ContextMenuContent
      data-slot='context-menu-sub-content'
      side={side}
      {...otherProps}
    />
  );
}

/** Uses the shared corrected Menu item contract; ContextMenu exports this same Base UI primitive. */
function ContextMenuItem(props: Readonly<ContextMenuItem.Props>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuItem
      data-slot='context-menu-item'
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
}

/** Native checkbox row with a relative indicator and unchanged checked/change semantics. */
function ContextMenuCheckboxItem(props: Readonly<ContextMenuCheckboxItem.Props>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuCheckboxItem
      data-slot='context-menu-checkbox-item'
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
}

/** Native radio row with a relative indicator and unchanged values/change semantics. */
function ContextMenuRadioItem(props: Readonly<ContextMenuRadioItem.Props>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuRadioItem
      data-slot='context-menu-radio-item'
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
}

/** Native submenu activation with the shared logical inset and RTL decorative arrow. */
function ContextMenuSubTrigger(props: Readonly<ContextMenuSubTrigger.Props>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuSubTrigger
      data-slot='context-menu-sub-trigger'
      className={(state) => cn(styles.item, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
}

/** Names the surrounding real primitive group. */
function ContextMenuLabel(props: Readonly<ContextMenuLabel.Props>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuLabel
      data-slot='context-menu-label'
      className={(state) => cn(styles.label, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
}
/** Separates sections with the shared real Menu separator. */
function ContextMenuSeparator(props: Readonly<ContextMenuSeparator.Props>): React.ReactElement {
  return (
    <DropdownMenuSeparator
      data-slot='context-menu-separator'
      {...props}
    />
  );
}
/** Shows a shortcut hint without registering keyboard handlers. */
function ContextMenuShortcut(props: Readonly<ContextMenuShortcut.Props>): React.ReactElement {
  return (
    <DropdownMenuShortcut
      data-slot='context-menu-shortcut'
      {...props}
    />
  );
}

// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenu {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuProps;
  export type State = BaseContextMenu.Root.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuGroupProps;
  export type State = BaseContextMenu.Group.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuPortal {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuPortalProps;
  export type State = BaseContextMenu.Portal.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuRadioGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuRadioGroupProps;
  export type State = BaseContextMenu.RadioGroup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuSub {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuSubProps;
  export type State = BaseContextMenu.SubmenuRoot.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuTriggerProps;
  export type State = BaseContextMenu.Trigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuContentProps;
  export type State = BaseContextMenu.Popup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuSubContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuContentProps;
  export type State = BaseContextMenu.Popup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuItemProps;
  export type State = BaseContextMenu.Item.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuCheckboxItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuCheckboxItemProps;
  export type State = BaseContextMenu.CheckboxItem.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuRadioItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuRadioItemProps;
  export type State = BaseContextMenu.RadioItem.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuSubTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuSubTriggerProps;
  export type State = BaseContextMenu.SubmenuTrigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuLabel {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuLabelProps;
  export type State = BaseContextMenu.GroupLabel.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuSeparator {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuSeparatorProps;
  export type State = BaseContextMenu.Separator.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace ContextMenuShortcut {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = ContextMenuShortcutProps;
  export type State = DropdownMenuShortcut.State;
}

export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
};
