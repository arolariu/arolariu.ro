"use client";

import {Menu as BaseMenu} from "@base-ui/react/menu";
import {useDirection} from "@base-ui/react/direction-provider";
import type {ComponentRenderFn, HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import {Check, ChevronRight, Circle} from "lucide-react";
import * as React from "react";

import {cn} from "@/lib/utilities";
import styles from "./dropdown-menu.module.css";

/** Readonly state and payload options owned by the Menu root. */
export type DropdownMenuProps<Payload = unknown> = Readonly<BaseMenu.Root.Props<Payload>>;
/** Accessible group props including primitive state-aware render and class callbacks. */
export type DropdownMenuGroupProps = Readonly<React.ComponentPropsWithRef<typeof BaseMenu.Group>>;
/** Real Portal props including container, keepMounted, render and DOM ref. */
export type DropdownMenuPortalProps = Readonly<React.ComponentPropsWithRef<typeof BaseMenu.Portal>>;
/** Native radio-group props, retaining upstream value and event-detail types. */
export type DropdownMenuRadioGroupProps = Readonly<React.ComponentPropsWithRef<typeof BaseMenu.RadioGroup>>;
/** Native submenu-root options; no additional GUI state is introduced. */
export type DropdownMenuSubProps = Readonly<BaseMenu.SubmenuRoot.Props>;
/** Primitive trigger props, including polymorphic HTMLElement refs and legacy child composition. */
export type DropdownMenuTriggerProps<Payload = unknown> = Readonly<
  Omit<BaseMenu.Trigger.Props<Payload>, "ref">
    & React.RefAttributes<HTMLElement> & {
      /** Legacy single-child composition. Prefer `render`. @default false */
      asChild?: boolean;
    }
>;
/** Primitive submenu trigger options with logical inset spacing. */
export type DropdownMenuSubTriggerProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.SubmenuTrigger> & {
    /** Align text with indicator rows. @default false */
    inset?: boolean;
  }
>;

type DropdownMenuPositioningProps = Omit<BaseMenu.Positioner.Props, keyof BaseMenu.Popup.Props>;
type MenuDataAttributes = {readonly [key: `data-${string}`]: string | number | boolean | undefined};

/** Popup props target the role-bearing menu; placement options target its Positioner. */
export type DropdownMenuContentProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.Popup>
    & DropdownMenuPositioningProps & {
      /** Additional Positioner DOM, ref, render and state-class props. */
      positionerProps?: Readonly<
        Omit<React.ComponentPropsWithRef<typeof BaseMenu.Positioner>, keyof DropdownMenuPositioningProps | "children"> & MenuDataAttributes
      >;
      /** Portal options. Nested modal menus should target the enclosing primitive Portal, not an external sibling. */
      portalProps?: Readonly<Omit<React.ComponentPropsWithRef<typeof BaseMenu.Portal>, "children"> & MenuDataAttributes>;
    }
>;
/** Primitive item props with presentation-only variants. */
export type DropdownMenuItemProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.Item> & {
    /** Align text with indicator rows. @default false */
    inset?: boolean;
    /** Visual treatment without changing activation behavior. @default "default" */
    variant?: "default" | "destructive";
    /** Legacy single-child composition. Prefer `render`. @default false */
    asChild?: boolean;
  }
>;
/** Native checkbox options; checked values and change details are not adapted. */
export type DropdownMenuCheckboxItemProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.CheckboxItem> & {
    /** Add a further logical inset to the indicator row. @default false */
    inset?: boolean;
  }
>;
/** Native radio options with optional logical inset spacing. */
export type DropdownMenuRadioItemProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.RadioItem> & {
    /** Add a further logical inset to the indicator row. @default false */
    inset?: boolean;
  }
>;
/** Primitive group label props with optional logical inset spacing. */
export type DropdownMenuLabelProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseMenu.GroupLabel> & {
    /** Align text with indicator rows. @default false */
    inset?: boolean;
  }
>;
/** Primitive separator props. */
export type DropdownMenuSeparatorProps = Readonly<React.ComponentPropsWithRef<typeof BaseMenu.Separator>>;
/** Presentation-only shortcut props with native span refs and render composition. */
export type DropdownMenuShortcutProps = Readonly<
  React.ComponentPropsWithRef<"span"> & {
    /** Replace the span while preserving its props. */
    render?: useRender.RenderProp<Record<string, never>>;
    /** Legacy single-child composition. Prefer `render`. @default false */
    asChild?: boolean;
  }
>;

type MenuRender<State> = React.ReactElement | ComponentRenderFn<HTMLProps, State> | undefined;

function getMenuRenderElement<State>(render: MenuRender<State>): React.ReactElement<{children?: React.ReactNode}> | undefined {
  if (typeof render === "function") return undefined;
  // eslint-disable-next-line react-x/no-children-to-array -- React's public resolver unwraps Flight-lazy render elements supported by Base UI.
  const [element] = React.Children.toArray(render);
  return React.isValidElement<{children?: React.ReactNode}>(element) ? element : undefined;
}

function getMenuChildren<State>(children: React.ReactNode, render: MenuRender<State>): React.ReactNode {
  return children === undefined ? getMenuRenderElement(render)?.props.children : children;
}

function withMenuChildren<State>(render: MenuRender<State>, children: React.ReactNode): MenuRender<State> {
  const element = getMenuRenderElement(render);
  // eslint-disable-next-line react-x/no-clone-element -- Normalize only compound children; Base UI still merges state, handlers and refs.
  return element ? React.cloneElement(element, {children}) : render;
}

/** Coordinates Menu state, accessible relationships and payload children without a DOM wrapper. */
function DropdownMenu<Payload>(props: Readonly<DropdownMenu.Props<Payload>>): React.JSX.Element {
  return <BaseMenu.Root {...props} />;
}

/** Groups related menu items using the primitive's accessible group semantics. */
const DropdownMenuGroup = BaseMenu.Group;
/** Hosts menu content in the primitive portal, supporting custom document containers. */
const DropdownMenuPortal = BaseMenu.Portal;
/** Preserves native radio values (including null) and cancellable change details. */
const DropdownMenuRadioGroup = BaseMenu.RadioGroup;
/** Coordinates nested Menu state and keyboard behavior. */
const DropdownMenuSub = BaseMenu.SubmenuRoot;

/**
 * Opens a menu with the primitive's native button behavior by default.
 * Set nativeButton={false} for non-button render targets. Legacy intrinsic
 * asChild targets infer nativeButton; custom components may specify it.
 */
function DropdownMenuTrigger<Payload>(props: Readonly<DropdownMenuTrigger.Props<Payload>>): React.JSX.Element {
  const {asChild = false, children, render, nativeButton, ref, ...otherProps} = props;
  const legacyChild = asChild && React.isValidElement(children) && children.type !== React.Fragment ? children : undefined;
  const renderProp = legacyChild ?? render;
  // The primitive accepts HTMLElement refs at runtime, but its default-tag Props still include a button ref.
  const primitiveRef = React.useCallback(
    (element: HTMLElement | null): ReturnType<React.RefCallback<HTMLElement>> => {
      if (typeof ref === "function") return ref(element);
      if (ref) ref.current = element;
    },
    [ref],
  );
  return (
    <BaseMenu.Trigger
      data-slot='dropdown-menu-trigger'
      {...otherProps}
      ref={primitiveRef}
      nativeButton={nativeButton ?? (legacyChild ? legacyChild.type === "button" : true)}
      render={legacyChild || children === undefined ? renderProp : withMenuChildren(renderProp, children)}>
      {legacyChild ? undefined : children}
    </BaseMenu.Trigger>
  );
}

/** Opens a submenu, retaining primitive render/class state and a direction-aware decorative arrow. */
function DropdownMenuSubTrigger(props: Readonly<DropdownMenuSubTrigger.Props>): React.ReactElement {
  const direction = useDirection();
  const {className, children, inset = false, render, ...otherProps} = props;
  const content = (
    <>
      {getMenuChildren(children, render)}
      <ChevronRight
        aria-hidden='true'
        data-direction={direction}
        className={styles.subTriggerIcon}
      />
    </>
  );
  return (
    <BaseMenu.SubmenuTrigger
      data-slot='dropdown-menu-sub-trigger'
      data-inset={inset}
      {...otherProps}
      className={(state) =>
        cn(styles.item, styles.subTrigger, inset && styles.inset, typeof className === "function" ? className(state) : className)
      }
      render={withMenuChildren(render, content)}>
      {content}
    </BaseMenu.SubmenuTrigger>
  );
}

/**
 * Portals and positions the role-bearing Popup.
 * Popup ARIA, event handlers, render state, class callbacks, ref and finalFocus
 * never land on the positioning container. Defaults: bottom/start, offsets 4/0.
 */
const DropdownMenuContent = React.forwardRef<React.ComponentRef<typeof BaseMenu.Popup>, DropdownMenuContent.Props>(
  (props: Readonly<DropdownMenuContent.Props>, ref): React.ReactElement => {
    const direction = useDirection();
    const {
      align = "start",
      alignOffset = 0,
      side = "bottom",
      sideOffset = 4,
      anchor,
      positionMethod,
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
    const positionerClassName = positionerProps?.className;
    const popup = (
      <BaseMenu.Popup
        data-slot='dropdown-menu-content'
        {...popupProps}
        ref={ref}
        dir={dir}
        render={children === undefined ? render : withMenuChildren(render, children)}
        className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}>
        {children}
      </BaseMenu.Popup>
    );
    const positioner = (
      <BaseMenu.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        positionMethod={positionMethod}
        collisionBoundary={collisionBoundary}
        collisionPadding={collisionPadding}
        sticky={sticky}
        arrowPadding={arrowPadding}
        disableAnchorTracking={disableAnchorTracking}
        collisionAvoidance={collisionAvoidance}
        {...positionerProps}
        render={withMenuChildren(positionerProps?.render, popup)}
        className={(state) =>
          cn(styles.positioner, typeof positionerClassName === "function" ? positionerClassName(state) : positionerClassName)
        }>
        {popup}
      </BaseMenu.Positioner>
    );
    return (
      <DropdownMenuPortal
        {...portalProps}
        render={withMenuChildren(portalProps?.render, null)}>
        {positioner}
      </DropdownMenuPortal>
    );
  },
);
DropdownMenuContent.displayName = "DropdownMenuContent";

/** Portaled submenu Popup. Defaults: inline-end/start (right in LTR), offsets 0/-3. */
function DropdownMenuSubContent(props: Readonly<DropdownMenuSubContent.Props>): React.ReactElement {
  const {align = "start", alignOffset = -3, side = "inline-end", sideOffset = 0, ...otherProps} = props;
  return (
    <DropdownMenuContent
      data-slot='dropdown-menu-sub-content'
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      {...otherProps}
    />
  );
}

/** Activates a primitive-owned menu item with optional inset and destructive presentation. */
function DropdownMenuItem(props: Readonly<DropdownMenuItem.Props>): React.ReactElement {
  const {asChild = false, children, className, inset = false, variant = "default", render, nativeButton, ...otherProps} = props;
  const legacyChild = asChild && React.isValidElement(children) && children.type !== React.Fragment ? children : undefined;
  const renderProp = legacyChild ?? render;
  return (
    <BaseMenu.Item
      data-slot='dropdown-menu-item'
      data-inset={inset}
      data-variant={variant}
      {...otherProps}
      nativeButton={nativeButton ?? (legacyChild ? legacyChild.type === "button" : false)}
      className={(state) => cn(styles.item, inset && styles.inset, typeof className === "function" ? className(state) : className)}
      render={legacyChild || children === undefined ? renderProp : withMenuChildren(renderProp, children)}>
      {legacyChild ? undefined : children}
    </BaseMenu.Item>
  );
}

/** Toggles the real Menu checkbox; its indicator and label share the render target. */
function DropdownMenuCheckboxItem(props: Readonly<DropdownMenuCheckboxItem.Props>): React.ReactElement {
  const {className, children, inset = false, render, ...otherProps} = props;
  const content = (
    <>
      <span className={styles.indicatorSlot}>
        <BaseMenu.CheckboxItemIndicator>
          <Check
            aria-hidden='true'
            className={styles.indicatorIcon}
          />
        </BaseMenu.CheckboxItemIndicator>
      </span>
      {getMenuChildren(children, render)}
    </>
  );
  return (
    <BaseMenu.CheckboxItem
      data-slot='dropdown-menu-checkbox-item'
      data-inset={inset}
      {...otherProps}
      className={(state) =>
        cn(
          styles.item,
          styles.indicatorItem,
          inset && styles.indicatorInset,
          typeof className === "function" ? className(state) : className,
        )
      }
      render={withMenuChildren(render, content)}>
      {content}
    </BaseMenu.CheckboxItem>
  );
}

/** Selects a native Menu radio value with an indicator relative to its own row. */
function DropdownMenuRadioItem(props: Readonly<DropdownMenuRadioItem.Props>): React.ReactElement {
  const {className, children, inset = false, render, ...otherProps} = props;
  const content = (
    <>
      <span className={styles.indicatorSlot}>
        <BaseMenu.RadioItemIndicator>
          <Circle
            aria-hidden='true'
            className={styles.radioIndicatorIcon}
          />
        </BaseMenu.RadioItemIndicator>
      </span>
      {getMenuChildren(children, render)}
    </>
  );
  return (
    <BaseMenu.RadioItem
      data-slot='dropdown-menu-radio-item'
      data-inset={inset}
      {...otherProps}
      className={(state) =>
        cn(
          styles.item,
          styles.indicatorItem,
          inset && styles.indicatorInset,
          typeof className === "function" ? className(state) : className,
        )
      }
      render={withMenuChildren(render, content)}>
      {content}
    </BaseMenu.RadioItem>
  );
}

/** Names the surrounding primitive Menu group; not a substitute for Popup aria-label. */
function DropdownMenuLabel(props: Readonly<DropdownMenuLabel.Props>): React.ReactElement {
  const {className, children, render, inset = false, ...otherProps} = props;
  return (
    <BaseMenu.GroupLabel
      data-slot='dropdown-menu-label'
      data-inset={inset}
      {...otherProps}
      render={children === undefined ? render : withMenuChildren(render, children)}
      className={(state) => cn(styles.label, inset && styles.inset, typeof className === "function" ? className(state) : className)}>
      {children}
    </BaseMenu.GroupLabel>
  );
}

/** Separates Menu sections using the real separator primitive and its render state. */
function DropdownMenuSeparator(props: Readonly<DropdownMenuSeparator.Props>): React.ReactElement {
  const {className, ...otherProps} = props;
  return (
    <BaseMenu.Separator
      data-slot='dropdown-menu-separator'
      {...otherProps}
      className={(state) => cn(styles.separator, typeof className === "function" ? className(state) : className)}
    />
  );
}

/** Displays a trailing shortcut hint; does not register a keyboard shortcut. */
function DropdownMenuShortcut(props: Readonly<DropdownMenuShortcut.Props>): React.ReactElement {
  const {asChild = false, children, className, render, ref, ...otherProps} = props;
  const legacyChild = asChild && React.isValidElement(children) && children.type !== React.Fragment ? children : undefined;
  const renderProp = legacyChild ?? render;
  return useRender({
    defaultTagName: "span",
    ref,
    render: legacyChild || children === undefined ? renderProp : withMenuChildren(renderProp, children),
    props: {
      "data-slot": "dropdown-menu-shortcut",
      ...otherProps,
      className: cn(styles.shortcut, className),
      ...(legacyChild || children === undefined ? {} : {children}),
    },
  });
}

// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenu {
  export type Props<Payload = unknown> = DropdownMenuProps<Payload>;
  export type State = BaseMenu.Root.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuGroupProps;
  export type State = BaseMenu.Group.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuPortal {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuPortalProps;
  export type State = BaseMenu.Portal.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuRadioGroup {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuRadioGroupProps;
  export type State = BaseMenu.RadioGroup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuSub {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuSubProps;
  export type State = BaseMenu.SubmenuRoot.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuTrigger {
  export type Props<Payload = unknown> = DropdownMenuTriggerProps<Payload>;
  export type State = BaseMenu.Trigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuSubTrigger {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuSubTriggerProps;
  export type State = BaseMenu.SubmenuTrigger.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuContentProps;
  export type State = BaseMenu.Popup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuSubContent {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuContentProps;
  export type State = BaseMenu.Popup.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuItemProps;
  export type State = BaseMenu.Item.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuCheckboxItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuCheckboxItemProps;
  export type State = BaseMenu.CheckboxItem.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuRadioItem {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuRadioItemProps;
  export type State = BaseMenu.RadioItem.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuLabel {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuLabelProps;
  export type State = BaseMenu.GroupLabel.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuSeparator {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuSeparatorProps;
  export type State = BaseMenu.Separator.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace API
namespace DropdownMenuShortcut {
  // eslint-disable-next-line sonarjs/redundant-type-aliases -- canonical namespace alias is a supported public typing API
  export type Props = DropdownMenuShortcutProps;
  export type State = Record<string, never>;
}

export {
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
};
