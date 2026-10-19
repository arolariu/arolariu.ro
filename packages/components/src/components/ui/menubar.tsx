"use client";

import {Menubar as BaseMenubar} from "@base-ui/react/menubar";
import * as React from "react";

import {cn} from "@/lib/utilities";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import styles from "./menubar.module.css";

/** Readonly real Menubar props including state-aware class and render callbacks. */
export type MenubarProps = Readonly<React.ComponentPropsWithRef<typeof BaseMenubar>>;
/** Shared generic Menu root props, preserving payload inference. */
export type MenubarMenuProps<Payload = unknown> = DropdownMenu.Props<Payload>;
/** Shared accessible Menu group props. */
export type MenubarGroupProps = DropdownMenuGroup.Props;
/** Shared real Menu Portal props. */
export type MenubarPortalProps = DropdownMenuPortal.Props;
/** Shared native radio-group values and event details. */
export type MenubarRadioGroupProps = DropdownMenuRadioGroup.Props;
/** Shared native submenu-root props. */
export type MenubarSubProps = DropdownMenuSub.Props;
/** Native Menu trigger props and accurate polymorphic refs. */
export type MenubarTriggerProps<Payload = unknown> = DropdownMenuTrigger.Props<Payload>;
/** Popup props with separate primitive positioning and portal options. */
export type MenubarContentProps = DropdownMenuContent.Props;
/** Menu item props with optional destructive presentation and inset. */
export type MenubarItemProps = DropdownMenuItem.Props;
/** Native checkbox item props with optional inset. */
export type MenubarCheckboxItemProps = DropdownMenuCheckboxItem.Props;
/** Native radio item props with optional inset. */
export type MenubarRadioItemProps = DropdownMenuRadioItem.Props;
/** Native submenu trigger props with optional inset. */
export type MenubarSubTriggerProps = DropdownMenuSubTrigger.Props;
/** Native group-label props with optional inset. */
export type MenubarLabelProps = DropdownMenuLabel.Props;
/** Native separator props. */
export type MenubarSeparatorProps = DropdownMenuSeparator.Props;
/** Presentation-only shortcut props. */
export type MenubarShortcutProps = DropdownMenuShortcut.Props;

/** Menu root and payload contract shared with the corrected DropdownMenu. */
const MenubarMenu = DropdownMenu;
/** Accessible Menu group shared with DropdownMenu. */
const MenubarGroup = DropdownMenuGroup;
/** Real Menu portal shared with DropdownMenu. */
const MenubarPortal = DropdownMenuPortal;
/** Native Menu radio group values and event details. */
const MenubarRadioGroup = DropdownMenuRadioGroup;
/** Real nested Menu root, preserving keyboard behavior. */
const MenubarSub = DropdownMenuSub;

/** Coordinates real menubar roving focus, orientation and accessible naming. */
const Menubar = ({ref, ...props}: Readonly<Menubar.Props>): React.ReactElement => {
  const {className, render, children, ...otherProps} = props;
  let renderProp = render;
  if (typeof render !== "function" && children !== undefined) {
    // eslint-disable-next-line react-x/no-children-to-array -- Resolve Flight-lazy render elements using React's public boundary.
    const [element] = React.Children.toArray(render);
    // eslint-disable-next-line react-x/no-clone-element -- Override only explicit children; Menubar owns state, refs and event composition.
    if (React.isValidElement<{children?: React.ReactNode}>(element)) renderProp = React.cloneElement(element, {children});
  }
  return (
    <BaseMenubar
      data-slot='menubar'
      ref={ref}
      render={renderProp}
      className={(state) => cn(styles.root, typeof className === "function" ? className(state) : className)}
      {...otherProps}>
      {children}
    </BaseMenubar>
  );
};
Menubar.displayName = "Menubar";

/** Uses the corrected Menu trigger; Base UI supplies menubar role and navigation state. */
function MenubarTrigger<Payload = unknown>({ref, ...props}: Readonly<MenubarTrigger.Props<Payload>>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuTrigger
      data-slot='menubar-trigger'
      ref={ref}
      className={(state) => cn(styles.trigger, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
}
MenubarTrigger.displayName = "MenubarTrigger";

/**
 * Portaled Menu Popup with start alignment and offsets 8/-4. Unless `side` is set, Base UI opens it
 * below a horizontal Menubar and toward the inline end of a vertical one.
 */
const MenubarContent = ({ref, ...props}: Readonly<MenubarContent.Props>): React.ReactElement => {
  const {align = "start", alignOffset = -4, sideOffset = 8, className, ...otherProps} = props;
  return (
    <DropdownMenuContent
      data-slot='menubar-content'
      align={align}
      alignOffset={alignOffset}
      sideOffset={sideOffset}
      ref={ref}
      className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
};
MenubarContent.displayName = "MenubarContent";

/** Portaled submenu with the shared inline-end/start placement and offsets 0/-3. */
const MenubarSubContent = ({ref, ...props}: Readonly<MenubarSubContent.Props>): React.ReactElement => {
  const {className, ...otherProps} = props;
  return (
    <DropdownMenuSubContent
      data-slot='menubar-sub-content'
      ref={ref}
      className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
};
MenubarSubContent.displayName = "MenubarSubContent";

/** Native Menu activation with the shared destructive/inset contract. */
const MenubarItem = ({ref, ...props}: Readonly<MenubarItem.Props>): React.ReactElement => {
  return (
    <DropdownMenuItem
      data-slot='menubar-item'
      ref={ref}
      {...props}
    />
  );
};
MenubarItem.displayName = "MenubarItem";
/** Native Menu checkbox with primitive checked state and cancellation details. */
const MenubarCheckboxItem = ({ref, ...props}: Readonly<MenubarCheckboxItem.Props>): React.ReactElement => {
  return (
    <DropdownMenuCheckboxItem
      data-slot='menubar-checkbox-item'
      ref={ref}
      {...props}
    />
  );
};
MenubarCheckboxItem.displayName = "MenubarCheckboxItem";
/** Native Menu radio value with the shared relative indicator. */
const MenubarRadioItem = ({ref, ...props}: Readonly<MenubarRadioItem.Props>): React.ReactElement => {
  return (
    <DropdownMenuRadioItem
      data-slot='menubar-radio-item'
      ref={ref}
      {...props}
    />
  );
};
MenubarRadioItem.displayName = "MenubarRadioItem";
/** Native submenu trigger with the shared direction-aware arrow. */
const MenubarSubTrigger = ({ref, ...props}: Readonly<MenubarSubTrigger.Props>): React.ReactElement => {
  return (
    <DropdownMenuSubTrigger
      data-slot='menubar-sub-trigger'
      ref={ref}
      {...props}
    />
  );
};
MenubarSubTrigger.displayName = "MenubarSubTrigger";
/** Names the surrounding Menu group using primitive relationships. */
const MenubarLabel = ({ref, ...props}: Readonly<MenubarLabel.Props>): React.ReactElement => {
  return (
    <DropdownMenuLabel
      data-slot='menubar-label'
      ref={ref}
      {...props}
    />
  );
};
MenubarLabel.displayName = "MenubarLabel";
/** Separates sections with the shared real Menu separator. */
const MenubarSeparator = ({ref, ...props}: Readonly<MenubarSeparator.Props>): React.ReactElement => {
  return (
    <DropdownMenuSeparator
      data-slot='menubar-separator'
      ref={ref}
      {...props}
    />
  );
};
MenubarSeparator.displayName = "MenubarSeparator";
/** Displays a trailing shortcut hint rather than a separately styled lookalike. */
const MenubarShortcut = ({ref, ...props}: Readonly<MenubarShortcut.Props>): React.ReactElement => {
  return (
    <DropdownMenuShortcut
      data-slot='menubar-shortcut'
      ref={ref}
      {...props}
    />
  );
};
MenubarShortcut.displayName = "MenubarShortcut";

// eslint-disable-next-line no-redeclare -- public component namespace API
namespace Menubar {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarProps;
  export type State = BaseMenubar.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarMenu {
  export type Props<Payload = unknown> = MenubarMenuProps<Payload>;
  export type State = DropdownMenu.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarGroupProps;
  export type State = DropdownMenuGroup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarPortal {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarPortalProps;
  export type State = DropdownMenuPortal.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarRadioGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarRadioGroupProps;
  export type State = DropdownMenuRadioGroup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarSub {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarSubProps;
  export type State = DropdownMenuSub.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarTrigger {
  export type Props<Payload = unknown> = MenubarTriggerProps<Payload>;
  export type State = DropdownMenuTrigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarContentProps;
  export type State = DropdownMenuContent.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarSubContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarContentProps;
  export type State = DropdownMenuSubContent.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarItemProps;
  export type State = DropdownMenuItem.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarCheckboxItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarCheckboxItemProps;
  export type State = DropdownMenuCheckboxItem.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarRadioItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarRadioItemProps;
  export type State = DropdownMenuRadioItem.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarSubTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarSubTriggerProps;
  export type State = DropdownMenuSubTrigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarLabel {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarLabelProps;
  export type State = DropdownMenuLabel.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarSeparator {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarSeparatorProps;
  export type State = DropdownMenuSeparator.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace MenubarShortcut {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = MenubarShortcutProps;
  export type State = DropdownMenuShortcut.State;
}

export {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarPortal,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
};
