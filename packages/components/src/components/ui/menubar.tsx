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
/** Popup props with separate primitive positioning and portal options, and Menubar offset defaults. */
export type MenubarContentProps = Readonly<
  Omit<DropdownMenuContent.Props, "alignOffset" | "sideOffset"> & {
    /** Offset in pixels along the alignment axis, or a function of the trigger and popup sizes. @default -4 */
    alignOffset?: DropdownMenuContent.Props["alignOffset"];
    /** Distance in pixels between the trigger and the popup, or a function of their sizes, side and alignment. @default 8 */
    sideOffset?: DropdownMenuContent.Props["sideOffset"];
  }
>;
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

/**
 * Menu root and payload contract shared with the corrected DropdownMenu.
 *
 * @remarks
 * - Client-only; render one per top-level menu inside `Menubar`, wrapping a `MenubarTrigger` and a `MenubarContent`.
 *   Base UI joins it to the menubar's roving focus and keyboard navigation between menus.
 *
 * @example
 * ```tsx
 * <MenubarMenu>
 *   <MenubarTrigger>Edit</MenubarTrigger>
 *   <MenubarContent>
 *     <MenubarItem onClick={undo}>Undo</MenubarItem>
 *   </MenubarContent>
 * </MenubarMenu>
 * ```
 */
const MenubarMenu = DropdownMenu;
/**
 * Accessible Menu group shared with DropdownMenu.
 *
 * @remarks
 * - Client-only; a `role="group"` inside menubar content, named by a `MenubarLabel` child.
 *
 * @example
 * ```tsx
 * <MenubarGroup>
 *   <MenubarLabel>Recent</MenubarLabel>
 *   <MenubarItem onClick={openReport}>report.pdf</MenubarItem>
 * </MenubarGroup>
 * ```
 */
const MenubarGroup = DropdownMenuGroup;
/**
 * Real Menu portal shared with DropdownMenu.
 *
 * @remarks
 * - Client-only. `MenubarContent` already renders this Portal (configure it with `portalProps`); use this part only
 *   when composing raw Base UI `Menu.Positioner`/`Menu.Popup` parts.
 *
 * @example
 * ```tsx
 * <MenubarPortal container={shadowRoot}>
 *   <Menu.Positioner>
 *     <Menu.Popup aria-label='File'>…</Menu.Popup>
 *   </Menu.Positioner>
 * </MenubarPortal>
 * ```
 */
const MenubarPortal = DropdownMenuPortal;
/**
 * Native Menu radio group values and event details.
 *
 * @remarks
 * - Client-only; a `role="group"` owning the single choice of its `MenubarRadioItem` children, named by a
 *   `MenubarLabel` child. Values (including `null`) and cancellable change details are Base UI's.
 *
 * @example
 * ```tsx
 * <MenubarRadioGroup value={zoom} onValueChange={setZoom}>
 *   <MenubarLabel>Zoom</MenubarLabel>
 *   <MenubarRadioItem value='fit'>Fit to window</MenubarRadioItem>
 *   <MenubarRadioItem value='100'>100%</MenubarRadioItem>
 * </MenubarRadioGroup>
 * ```
 */
const MenubarRadioGroup = DropdownMenuRadioGroup;
/**
 * Real nested Menu root, preserving keyboard behavior.
 *
 * @remarks
 * - Client-only; wrap one `MenubarSubTrigger` and one `MenubarSubContent`. Opens on hover, click, Enter, Space or the
 *   inline-end arrow key; Escape closes only the submenu unless `closeParentOnEsc` is set.
 *
 * @example
 * ```tsx
 * <MenubarSub>
 *   <MenubarSubTrigger>Open recent</MenubarSubTrigger>
 *   <MenubarSubContent aria-label='Recent files'>
 *     <MenubarItem onClick={openReport}>report.pdf</MenubarItem>
 *   </MenubarSubContent>
 * </MenubarSub>
 * ```
 */
const MenubarSub = DropdownMenuSub;

/**
 * Coordinates real menubar roving focus, orientation and accessible naming.
 *
 * @remarks
 * - Client-only; renders a `role="menubar"` element with `aria-orientation`. Compose `MenubarMenu` children and name
 *   the bar with `aria-label` or `aria-labelledby`.
 * - Base UI owns roving focus (arrow keys follow `orientation`, wrapping while `loopFocus` is `true`), modality
 *   (`modal`, default `true`) and `disabled`.
 *
 * @example
 * ```tsx
 * <Menubar aria-label='Editor'>
 *   <MenubarMenu>
 *     <MenubarTrigger>File</MenubarTrigger>
 *     <MenubarContent>
 *       <MenubarItem onClick={createFile}>
 *         New file <MenubarShortcut>Ctrl+N</MenubarShortcut>
 *       </MenubarItem>
 *     </MenubarContent>
 *   </MenubarMenu>
 * </Menubar>
 * ```
 */
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

/**
 * Uses the corrected Menu trigger; Base UI supplies menubar role and navigation state.
 *
 * @remarks
 * - Client-only; render inside `MenubarMenu`. Within a menubar Base UI renders it as a `role="menuitem"` in the roving
 *   tab sequence with `aria-haspopup="menu"` and `aria-expanded`; click, Enter or Space opens its menu.
 *
 * @example
 * ```tsx
 * <MenubarTrigger>View</MenubarTrigger>
 * ```
 */
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
 * Portaled Menu Popup with Menubar placement defaults.
 *
 * @remarks
 * - Client-only; render inside `MenubarMenu`. Accepts every `DropdownMenuContent` prop with `align="start"`,
 *   `sideOffset={8}` and `alignOffset={-4}`. Unless `side` is set, Base UI opens it below a horizontal Menubar and
 *   toward the inline end of a vertical one.
 * - Base UI labels the `role="menu"` popup by its trigger unless an `aria-label` is given.
 *
 * @example
 * ```tsx
 * <MenubarContent>
 *   <MenubarItem onClick={save}>Save</MenubarItem>
 * </MenubarContent>
 * ```
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

/**
 * Portaled submenu with the shared inline-end/start placement and offsets 0/-3.
 *
 * @remarks
 * - Client-only; render inside `MenubarSub`. Accepts every `DropdownMenuSubContent` prop and default:
 *   `side="inline-end"` (right in LTR), `align="start"`, `sideOffset={0}` and `alignOffset={-3}`.
 *
 * @example
 * ```tsx
 * <MenubarSubContent aria-label='Recent files'>
 *   <MenubarItem onClick={openReport}>report.pdf</MenubarItem>
 * </MenubarSubContent>
 * ```
 */
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

/**
 * Native Menu activation with the shared destructive/inset contract.
 *
 * @remarks
 * - Client-only; a `role="menuitem"` whose `onClick` runs for pointer, Enter and Space activation, then closes the menu
 *   unless `closeOnClick={false}`. Supports `inset`, `variant="destructive"` and link `render` targets.
 *
 * @example
 * ```tsx
 * <MenubarItem onClick={print}>Print…</MenubarItem>
 * ```
 */
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
/**
 * Native Menu checkbox with primitive checked state and cancellation details.
 *
 * @remarks
 * - Client-only; a `role="menuitemcheckbox"` with `aria-checked` and an `aria-hidden` check. The menu stays open
 *   after toggling unless `closeOnClick` is set.
 *
 * @example
 * ```tsx
 * <MenubarCheckboxItem checked={wordWrap} onCheckedChange={setWordWrap}>
 *   Word wrap
 * </MenubarCheckboxItem>
 * ```
 */
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
/**
 * Native Menu radio value with the shared relative indicator.
 *
 * @remarks
 * - Client-only; render inside `MenubarRadioGroup`. A `role="menuitemradio"` with `aria-checked` and an `aria-hidden`
 *   dot; the menu stays open after selection unless `closeOnClick` is set.
 *
 * @example
 * ```tsx
 * <MenubarRadioGroup defaultValue='light'>
 *   <MenubarLabel>Theme</MenubarLabel>
 *   <MenubarRadioItem value='light'>Light</MenubarRadioItem>
 *   <MenubarRadioItem value='dark'>Dark</MenubarRadioItem>
 * </MenubarRadioGroup>
 * ```
 */
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
/**
 * Native submenu trigger with the shared direction-aware arrow.
 *
 * @remarks
 * - Client-only; render inside `MenubarSub`. A `role="menuitem"` with `aria-haspopup="menu"` whose `aria-hidden`
 *   chevron mirrors under an RTL `DirectionProvider`, where Base UI opens the submenu toward the left; `inset` aligns it
 *   with indicator rows.
 *
 * @example
 * ```tsx
 * <MenubarSub>
 *   <MenubarSubTrigger>Share</MenubarSubTrigger>
 *   <MenubarSubContent aria-label='Share options'>
 *     <MenubarItem onClick={copyLink}>Copy link</MenubarItem>
 *   </MenubarSubContent>
 * </MenubarSub>
 * ```
 */
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
/**
 * Names the surrounding Menu group using primitive relationships.
 *
 * @remarks
 * - Client-only; render as a child of `MenubarGroup` or `MenubarRadioGroup`, which Base UI labels with it. It is not
 *   focusable and does not name the popup.
 *
 * @example
 * ```tsx
 * <MenubarGroup>
 *   <MenubarLabel inset>Panels</MenubarLabel>
 *   <MenubarCheckboxItem inset>Terminal</MenubarCheckboxItem>
 * </MenubarGroup>
 * ```
 */
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
/**
 * Separates sections with the shared real Menu separator.
 *
 * @remarks
 * - Client-only; a non-focusable `role="separator"` between groups of items.
 *
 * @example
 * ```tsx
 * <MenubarContent>
 *   <MenubarItem onClick={save}>Save</MenubarItem>
 *   <MenubarSeparator />
 *   <MenubarItem onClick={closeWindow}>Close window</MenubarItem>
 * </MenubarContent>
 * ```
 */
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
/**
 * Displays a trailing shortcut hint rather than a separately styled lookalike.
 *
 * @remarks
 * - Presentation only: its text joins the item's accessible name and no keyboard handler is registered. Register the
 *   real shortcut yourself and expose it with `aria-keyshortcuts` on the item.
 *
 * @example
 * ```tsx
 * <MenubarItem onClick={save} aria-keyshortcuts='Control+S'>
 *   Save <MenubarShortcut>Ctrl+S</MenubarShortcut>
 * </MenubarItem>
 * ```
 */
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
  export type Props = DropdownMenuSubContent.Props;
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
