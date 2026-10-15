"use client";

import {Menu as BaseMenu} from "@base-ui/react/menu";
import {useDirection} from "@base-ui/react/direction-provider";
import type {ComponentRenderFn, HTMLProps} from "@base-ui/react/types";
import {useRender} from "@base-ui/react/use-render";
import {Check, ChevronRight, Circle} from "lucide-react";
import * as React from "react";

import {useMergedRefs} from "@/hooks/useMergedRefs";
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
/** Primitive trigger props, including polymorphic React 19 HTMLElement refs. */
export type DropdownMenuTriggerProps<Payload = unknown> = Readonly<
  Omit<BaseMenu.Trigger.Props<Payload>, "ref"> & React.RefAttributes<HTMLElement>
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
  if (render === undefined || typeof render === "function") return render;
  return function renderMenuElement(elementProps): React.ReactElement {
    return (
      <MenuElement
        render={render}
        elementProps={elementProps}>
        {children}
      </MenuElement>
    );
  };
}

/** Normalization belongs to a mounted primitive, never an unopened popup wrapper. */
function MenuElement({
  render,
  elementProps,
  children,
}: Readonly<{render: React.ReactElement; elementProps: HTMLProps; children: React.ReactNode}>): React.ReactElement {
  const element = getMenuRenderElement(render);
  if (!element || element.type === React.Fragment) throw new TypeError("Menu render requires a single non-Fragment React element.");
  // eslint-disable-next-line react-x/no-clone-element -- replace compound children while preserving primitive ref/event composition.
  return useRender({render: React.cloneElement(element, {children}), props: {...elementProps}});
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
 * Set nativeButton={false} for non-button render targets.
 */
function DropdownMenuTrigger<Payload = unknown>(props: Readonly<DropdownMenuTrigger.Props<Payload>>): React.JSX.Element {
  const {ref, children, render, nativeButton, className, ...otherProps} = props;
  const primitiveRef = useMergedRefs(ref);
  return (
    <BaseMenu.Trigger
      data-slot='dropdown-menu-trigger'
      ref={primitiveRef}
      className={(state) => cn(styles.trigger, typeof className === "function" ? className(state) : className)}
      nativeButton={nativeButton}
      render={children === undefined ? render : withMenuChildren(render, children)}
      {...otherProps}>
      {children}
    </BaseMenu.Trigger>
  );
}
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

/** Opens a submenu, retaining primitive render/class state and a direction-aware decorative arrow. */
const DropdownMenuSubTrigger = ({ref, ...props}: Readonly<DropdownMenuSubTrigger.Props>): React.ReactElement => {
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
      ref={ref}
      className={(state) =>
        cn(styles.item, styles.subTrigger, inset && styles.inset, typeof className === "function" ? className(state) : className)
      }
      render={withMenuChildren(render, content)}
      {...otherProps}>
      {content}
    </BaseMenu.SubmenuTrigger>
  );
};
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

/**
 * Portals and positions the role-bearing Popup.
 * Popup ARIA, event handlers, render state, class callbacks, ref and finalFocus
 * never land on the positioning container. Defaults: bottom/start, offsets 4/0.
 */
const DropdownMenuContent = ({ref, ...props}: Readonly<DropdownMenuContent.Props>): React.ReactElement => {
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
  const {className: positionerClassName, render: positionerRender, ...positionerNativeProps} = positionerProps ?? {};
  const {render: portalRender, ...portalNativeProps} = portalProps ?? {};
  const popup = (
    <BaseMenu.Popup
      data-slot='dropdown-menu-content'
      ref={ref}
      dir={dir}
      render={children === undefined ? render : withMenuChildren(render, children)}
      className={(state) => cn(styles.content, typeof className === "function" ? className(state) : className)}
      {...popupProps}>
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
      render={withMenuChildren(positionerRender, popup)}
      className={(state) =>
        cn(styles.positioner, typeof positionerClassName === "function" ? positionerClassName(state) : positionerClassName)
      }
      {...positionerNativeProps}>
      {popup}
    </BaseMenu.Positioner>
  );
  return (
    <DropdownMenuPortal
      render={withMenuChildren(portalRender, null)}
      {...portalNativeProps}>
      {positioner}
    </DropdownMenuPortal>
  );
};
DropdownMenuContent.displayName = "DropdownMenuContent";

/** Portaled submenu Popup. Defaults: inline-end/start (right in LTR), offsets 0/-3. */
const DropdownMenuSubContent = ({ref, ...props}: Readonly<DropdownMenuSubContent.Props>): React.ReactElement => {
  const {align = "start", alignOffset = -3, side = "inline-end", sideOffset = 0, ...otherProps} = props;
  return (
    <DropdownMenuContent
      data-slot='dropdown-menu-sub-content'
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
      ref={ref}
      {...otherProps}
    />
  );
};
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

/** Activates a primitive-owned menu item with optional inset and destructive presentation. */
const DropdownMenuItem = ({ref, ...props}: Readonly<DropdownMenuItem.Props>): React.ReactElement => {
  const {children, className, inset = false, variant = "default", render, nativeButton, ...otherProps} = props;
  return (
    <BaseMenu.Item
      data-slot='dropdown-menu-item'
      data-inset={inset}
      data-variant={variant}
      ref={ref}
      nativeButton={nativeButton}
      className={(state) => cn(styles.item, inset && styles.inset, typeof className === "function" ? className(state) : className)}
      render={children === undefined ? render : withMenuChildren(render, children)}
      {...otherProps}>
      {children}
    </BaseMenu.Item>
  );
};
DropdownMenuItem.displayName = "DropdownMenuItem";

/** Toggles the real Menu checkbox; its indicator and label share the render target. */
const DropdownMenuCheckboxItem = ({ref, ...props}: Readonly<DropdownMenuCheckboxItem.Props>): React.ReactElement => {
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
      ref={ref}
      className={(state) =>
        cn(
          styles.item,
          styles.indicatorItem,
          inset && styles.indicatorInset,
          typeof className === "function" ? className(state) : className,
        )
      }
      render={withMenuChildren(render, content)}
      {...otherProps}>
      {content}
    </BaseMenu.CheckboxItem>
  );
};
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

/** Selects a native Menu radio value with an indicator relative to its own row. */
const DropdownMenuRadioItem = ({ref, ...props}: Readonly<DropdownMenuRadioItem.Props>): React.ReactElement => {
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
      ref={ref}
      className={(state) =>
        cn(
          styles.item,
          styles.indicatorItem,
          inset && styles.indicatorInset,
          typeof className === "function" ? className(state) : className,
        )
      }
      render={withMenuChildren(render, content)}
      {...otherProps}>
      {content}
    </BaseMenu.RadioItem>
  );
};
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem";

/** Names the surrounding primitive Menu group; not a substitute for Popup aria-label. */
const DropdownMenuLabel = ({ref, ...props}: Readonly<DropdownMenuLabel.Props>): React.ReactElement => {
  const {className, children, render, inset = false, ...otherProps} = props;
  return (
    <BaseMenu.GroupLabel
      data-slot='dropdown-menu-label'
      data-inset={inset}
      ref={ref}
      render={children === undefined ? render : withMenuChildren(render, children)}
      className={(state) => cn(styles.label, inset && styles.inset, typeof className === "function" ? className(state) : className)}
      {...otherProps}>
      {children}
    </BaseMenu.GroupLabel>
  );
};
DropdownMenuLabel.displayName = "DropdownMenuLabel";

/** Separates Menu sections using the real separator primitive and its render state. */
const DropdownMenuSeparator = ({ref, ...props}: Readonly<DropdownMenuSeparator.Props>): React.ReactElement => {
  const {className, ...otherProps} = props;
  return (
    <BaseMenu.Separator
      data-slot='dropdown-menu-separator'
      ref={ref}
      className={(state) => cn(styles.separator, typeof className === "function" ? className(state) : className)}
      {...otherProps}
    />
  );
};
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

/** Displays a trailing shortcut hint; does not register a keyboard shortcut. */
const DropdownMenuShortcut = ({ref, ...props}: Readonly<DropdownMenuShortcut.Props>): React.ReactElement => {
  const {children, className, render, ...otherProps} = props;
  return useRender({
    defaultTagName: "span",
    ref,
    render: children === undefined ? render : withMenuChildren(render, children),
    props: {
      "data-slot": "dropdown-menu-shortcut",
      className: cn(styles.shortcut, className),
      ...(children === undefined ? {} : {children}),
      ...otherProps,
    },
  });
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

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
