/* eslint-disable max-lines */
"use client";

import {PanelLeft} from "lucide-react";
import type {Button as ButtonPrimitive} from "@base-ui/react/button";
import {DirectionProvider, useDirection} from "@base-ui/react/direction-provider";
import {mergeProps} from "@base-ui/react/merge-props";
import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Separator} from "@/components/ui/separator";
import {Skeleton} from "@/components/ui/skeleton";
import {Sheet, SheetContent, SheetDescription, SheetTitle} from "@/components/ui/sheet";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {useIsMobile} from "@/hooks/useIsMobile";
import {cn} from "@/lib/utilities";

import styles from "./sidebar.module.css";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

/** Readonly shared Button options; the ref targets its actual composed HTMLElement. */
export type SidebarTriggerProps = Readonly<React.ComponentPropsWithRef<typeof Button>>;
/** Native rail button options. */
export type SidebarRailProps = Readonly<React.ComponentPropsWithRef<"button">>;
/** Native main-region options; its ref is HTMLElement, not HTMLDivElement. */
export type SidebarInsetProps = Readonly<React.ComponentPropsWithRef<"main">>;
/** Shared input options, including its native input ref contract. */
export type SidebarInputProps = Readonly<React.ComponentPropsWithRef<typeof Input>>;
/** Header layout options. */
export type SidebarHeaderProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Footer layout options. */
export type SidebarFooterProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Shared separator options. */
export type SidebarSeparatorProps = Readonly<React.ComponentPropsWithRef<typeof Separator>>;
/** Scrollable content options. */
export type SidebarContentProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Navigation group options. */
export type SidebarGroupProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Navigation group-content options. */
export type SidebarGroupContentProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native menu-list options. */
export type SidebarMenuProps = Readonly<React.ComponentPropsWithRef<"ul">>;
/** Native menu-item options. */
export type SidebarMenuItemProps = Readonly<React.ComponentPropsWithRef<"li">>;
/** Presentational menu-badge options. */
export type SidebarMenuBadgeProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Native nested-list options. */
export type SidebarMenuSubProps = Readonly<React.ComponentPropsWithRef<"ul">>;
/** Native nested-item options. */
export type SidebarMenuSubItemProps = Readonly<React.ComponentPropsWithRef<"li">>;
/** Stateless group-label render callback state. */
export type SidebarGroupLabelState = Record<string, never>;
/** Group-action render callback state. */
export type SidebarGroupActionState = Readonly<{disabled: boolean}>;
/** Primary navigation render callback state. */
export type SidebarMenuButtonState = Readonly<{
  disabled: boolean;
  isActive: boolean;
  size: "default" | "sm" | "lg";
  variant: "default" | "outline";
}>;
/** Secondary action render callback state. */
export type SidebarMenuActionState = Readonly<{disabled: boolean; showOnHover: boolean}>;
/** Nested-link render callback state. */
export type SidebarMenuSubButtonState = Readonly<{isActive: boolean; size: "sm" | "md"}>;

type SidebarControlProps<State> = Readonly<
  Omit<ButtonPrimitive.Props, "render" | "className" | "style" | "ref" | "focusableWhenDisabled"> & {
    /** Element or callback composed by Base UI with the wrapper-owned state. */
    render?: useRender.ComponentProps<"button", State>["render"];
    /** Legacy single-element slot. Prefer render. @default false */
    asChild?: boolean;
    /** Presentation classes merged with both the wrapper and render element. */
    className?: string;
    /** Ref to the actual render target, including composed links. */
    ref?: React.Ref<HTMLElement>;
    /** Native style overrides; wrapper styling remains in CSS Modules. */
    style?: React.CSSProperties;
  }
>;

function sidebarLegacyChild(children: React.ReactNode, asChild: boolean): React.ReactElement | undefined {
  return asChild && React.isValidElement(children) && children.type !== React.Fragment ? children : undefined;
}

function isSidebarNavigationTarget(element: HTMLElement): boolean {
  return element.tagName === "A" && element.hasAttribute("href");
}

function useSidebarControlInteractions(
  element: React.ReactElement | undefined,
  hasRender: boolean,
  disabled: boolean,
  nativeButton?: boolean,
): Readonly<{
  ref: React.RefCallback<HTMLElement>;
  props: React.HTMLAttributes<HTMLElement> & {disabled?: boolean; type?: "button"};
}> {
  const spaceActivationRef = React.useRef(false);
  const intrinsicTag = typeof element?.type === "string" ? element.type : undefined;
  const native = nativeButton ?? (!hasRender || intrinsicTag === "button" || intrinsicTag === undefined);
  const [resolvedLink, setResolvedLink] = React.useState<boolean | undefined>(undefined);
  const resolvedLinkRef = React.useRef<boolean | undefined>(undefined);
  const inspectTarget = !native && intrinsicTag === undefined;
  const targetRef = React.useCallback<React.RefCallback<HTMLElement>>(
    (node) => {
      if (!inspectTarget || !node) return undefined;
      const syncTarget = (): void => {
        const nextLink = isSidebarNavigationTarget(node);
        if (resolvedLinkRef.current !== nextLink) {
          resolvedLinkRef.current = nextLink;
          setResolvedLink(nextLink);
        }
      };
      syncTarget();
      const observer = new MutationObserver(syncTarget);
      observer.observe(node, {attributes: true, attributeFilter: ["href"]});
      return (): void => {
        observer.disconnect();
        resolvedLinkRef.current = undefined;
      };
    },
    [inspectTarget],
  );
  const link =
    intrinsicTag === undefined
      ? resolvedLink
      : intrinsicTag === "a"
        && React.isValidElement<{href?: string | null}>(element)
        && element.props.href !== undefined
        && element.props.href !== null;
  const preventDisabledActivation = (event: React.SyntheticEvent<HTMLElement>): void => {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  return {
    ref: targetRef,
    props: {
      ...(native
        ? {disabled, type: "button" as const}
        : {
            "aria-disabled": disabled || undefined,
            tabIndex: disabled ? -1 : link === false ? 0 : undefined,
            role: link === false ? "button" : undefined,
          }),
      onClickCapture: preventDisabledActivation,
      onPointerDownCapture: preventDisabledActivation,
      onMouseDownCapture: preventDisabledActivation,
      onKeyDownCapture(event) {
        if (event.key === " ") spaceActivationRef.current = false;
        if (disabled && (event.key === "Enter" || event.key === " ")) {
          preventDisabledActivation(event);
        }
      },
      onKeyUpCapture(event) {
        if (disabled && (event.key === "Enter" || event.key === " ")) {
          spaceActivationRef.current = false;
          preventDisabledActivation(event);
        }
      },
      onKeyDown(event) {
        if (
          native
          || event.currentTarget.tagName === "BUTTON"
          || isSidebarNavigationTarget(event.currentTarget)
          || disabled
          || event.defaultPrevented
          || event.target !== event.currentTarget
        )
          return;
        if (event.key === "Enter" || event.key === " ") {
          spaceActivationRef.current = event.key === " ";
          event.preventDefault();
          if (event.key === "Enter") event.currentTarget.click();
        }
      },
      onKeyUp(event) {
        const activate = spaceActivationRef.current;
        spaceActivationRef.current = false;
        if (
          activate
          && !native
          && event.currentTarget.tagName !== "BUTTON"
          && !isSidebarNavigationTarget(event.currentTarget)
          && !disabled
          && !event.defaultPrevented
          && event.target === event.currentTarget
          && event.key === " "
        ) {
          event.preventDefault();
          event.currentTarget.click();
        }
      },
    },
  };
}

/** Desktop and mobile state owned by one provider subtree. */
export type SidebarContextProps = Readonly<{
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  isMobile: boolean;
  toggleSidebar: () => void;
}>;

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

/**
 * Returns the active sidebar context and enforces provider usage.
 *
 * @remarks
 * Must be called from within {@link SidebarProvider}. Exposes desktop and mobile
 * open state along with the shared toggle helper used by sidebar primitives.
 *
 * @example
 * ```tsx
 * const {open, toggleSidebar} = useSidebar();
 * ```
 *
 * @see {@link https://react.dev/reference/react/useContext | React useContext Docs}
 */
function useSidebar(): SidebarContextProps {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

/**
 * Props for the sidebar provider.
 */
export interface SidebarProviderProps extends Readonly<React.ComponentPropsWithRef<"div">> {
  /**
   * Initial uncontrolled open state for desktop layouts.
   * @default true
   */
  readonly defaultOpen?: boolean;
  /**
   * Controlled open state for desktop layouts.
   * @default undefined
   */
  readonly open?: boolean;
  /**
   * Callback invoked when the desktop open state changes.
   * @default undefined
   */
  readonly onOpenChange?: (open: boolean) => void;
}

/**
 * Provides shared sidebar state, keyboard shortcuts, and responsive behavior.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built on shared React context and tooltip primitives
 * - Persists desktop collapse state to a cookie for cross-page continuity
 *
 * @example
 * ```tsx
 * <SidebarProvider>
 *   <Sidebar />
 * </SidebarProvider>
 * ```
 *
 * @see {@link https://react.dev/reference/react/useContext | React Context Docs}
 */
const SidebarProvider = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  (
    {defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, children, dir, ...props}: Readonly<SidebarProviderProps>,
    ref,
  ): React.JSX.Element => {
    const isMobile = useIsMobile();
    const inheritedDirection = useDirection();
    const direction = dir === "rtl" || dir === "ltr" ? dir : inheritedDirection;
    const [openMobile, setOpenMobile] = React.useState(false);
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const open = openProp ?? internalOpen;

    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const nextValue = typeof value === "function" ? value(open) : value;

        if (setOpenProp) {
          setOpenProp(nextValue);
        } else {
          setInternalOpen(nextValue);
        }

        // eslint-disable-next-line unicorn/no-document-cookie -- persistent sidebar state matches V1 behavior
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${nextValue}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
      },
      [open, setOpenProp],
    );

    const toggleSidebar = React.useCallback(() => {
      if (isMobile) {
        setOpenMobile((currentOpen) => !currentOpen);
        return;
      }

      setOpen((currentOpen) => !currentOpen);
    }, [isMobile, setOpen]);

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (!event.defaultPrevented && event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          toggleSidebar();
        }
      };

      globalThis.window.addEventListener("keydown", handleKeyDown);

      return () => {
        globalThis.window.removeEventListener("keydown", handleKeyDown);
      };
    }, [toggleSidebar]);

    const state = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo<SidebarContextProps>(
      () => ({
        isMobile,
        open,
        openMobile,
        setOpen,
        setOpenMobile,
        state,
        toggleSidebar,
      }),
      [isMobile, open, openMobile, setOpen, state, toggleSidebar],
    );

    return (
      <DirectionProvider direction={direction}>
        <SidebarContext.Provider value={contextValue}>
          <TooltipProvider delay={0}>
            <div
              ref={ref}
              dir={dir}
              data-slot='sidebar-wrapper'
              className={cn(styles.wrapper, className)}
              {...props}>
              {children}
            </div>
          </TooltipProvider>
        </SidebarContext.Provider>
      </DirectionProvider>
    );
  },
);
SidebarProvider.displayName = "SidebarProvider";

/**
 * Props for the root sidebar panel.
 */
export type SidebarProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /**
     * Edge of the screen where the sidebar is rendered.
     * @default "left"
     */
    side?: "left" | "right";
    /**
     * Visual presentation style used for desktop rendering.
     * @default "sidebar"
     */
    variant?: "sidebar" | "floating" | "inset";
    /**
     * Desktop collapse behavior for the sidebar.
     * @default "offcanvas"
     */
    collapsible?: "offcanvas" | "icon" | "none";
  }
>;

/**
 * Renders the responsive sidebar panel for desktop and mobile layouts.
 *
 * @remarks
 * - Renders a `<div>` element on desktop and a dialog portal on mobile
 * - Built on the shared sidebar context
 *
 * @example
 * ```tsx
 * <Sidebar>
 *   <SidebarContent />
 * </Sidebar>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/Accessibility/ARIA/Roles/dialog_role | ARIA Dialog Role}
 */
const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, dir: dirProp, ...props}: Readonly<SidebarProps>,
    ref,
  ): React.JSX.Element => {
    const {isMobile, openMobile, setOpenMobile, state} = useSidebar();
    const direction = useDirection();
    const dir = dirProp ?? direction;
    const localDirection = dir === "rtl" || dir === "ltr" ? dir : direction;

    if (collapsible === "none") {
      return (
        <DirectionProvider direction={localDirection}>
          <div
            ref={ref}
            dir={dir}
            data-sidebar='sidebar'
            className={cn(styles.staticSidebar, className)}
            {...props}>
            {children}
          </div>
        </DirectionProvider>
      );
    }

    if (isMobile) {
      return (
        <DirectionProvider direction={localDirection}>
          <Sheet
            open={openMobile}
            onOpenChange={setOpenMobile}>
            <SheetContent
              {...props}
              ref={ref}
              dir={dir}
              side={side}
              data-sidebar='sidebar'
              data-mobile='true'
              showCloseButton={false}
              className={cn(styles.mobilePanel, className)}>
              <SheetTitle className={styles.srOnly}>Sidebar</SheetTitle>
              <SheetDescription className={styles.srOnly}>Displays the mobile sidebar.</SheetDescription>
              <div className={styles.mobileContent}>{children}</div>
            </SheetContent>
          </Sheet>
        </DirectionProvider>
      );
    }

    return (
      <DirectionProvider direction={localDirection}>
        <div
          ref={ref}
          dir={dir}
          className={styles.desktopRoot}
          data-state={state}
          data-collapsible={state === "collapsed" ? collapsible : ""}
          data-variant={variant}
          data-side={side}>
          <div className={styles.gap} />
          <div
            className={cn(styles.panelWrap, className)}
            {...props}>
            <div
              data-sidebar='sidebar'
              className={styles.panel}>
              {children}
            </div>
          </div>
        </div>
      </DirectionProvider>
    );
  },
);
Sidebar.displayName = "Sidebar";

/**
 * Renders the primary button used to toggle the sidebar.
 *
 * @remarks
 * - Renders the shared `Button` component
 * - Built on the shared sidebar context
 *
 * @example
 * ```tsx
 * <SidebarTrigger />
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/button | HTML button element}
 */
const SidebarTrigger = React.forwardRef<React.ComponentRef<typeof Button>, SidebarTriggerProps>(
  ({className, onClick, ...props}: Readonly<SidebarTriggerProps>, ref): React.JSX.Element => {
    const {toggleSidebar} = useSidebar();

    return (
      <Button
        ref={ref}
        data-sidebar='trigger'
        variant='ghost'
        size='icon'
        className={cn(styles.trigger, className)}
        {...mergeProps<"button">(
          {
            onClick: (event) => {
              if (!event.defaultPrevented) toggleSidebar();
            },
          },
          {onClick},
        )}
        {...props}>
        <PanelLeft className={styles.triggerIcon} />
        <span className={styles.srOnly}>Toggle Sidebar</span>
      </Button>
    );
  },
);
SidebarTrigger.displayName = "SidebarTrigger";

/**
 * Renders a slim rail button used to toggle the sidebar collapsed state.
 *
 * @remarks
 * - Renders a `<button>` element
 * - Built on the shared sidebar context
 *
 * @example
 * ```tsx
 * <SidebarRail />
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/button | HTML button element}
 */
const SidebarRail = React.forwardRef<HTMLButtonElement, SidebarRailProps>(
  ({className, onClick, ...props}: Readonly<SidebarRailProps>, ref): React.JSX.Element => {
    const {toggleSidebar} = useSidebar();

    return (
      <button
        ref={ref}
        data-sidebar='rail'
        aria-label='Toggle Sidebar'
        tabIndex={-1}
        title='Toggle Sidebar'
        type='button'
        className={cn(styles.rail, className)}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) toggleSidebar();
        }}
        {...props}
      />
    );
  },
);
SidebarRail.displayName = "SidebarRail";

/**
 * Renders the inset main content region adjacent to the sidebar.
 *
 * @remarks
 * - Renders a `<main>` element
 * - Built as a layout helper for inset sidebar variants
 *
 * @example
 * ```tsx
 * <SidebarInset>Main content</SidebarInset>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/main | HTML main element}
 */
const SidebarInset = React.forwardRef<HTMLElement, SidebarInsetProps>(
  ({className, ...props}: Readonly<SidebarInsetProps>, ref): React.JSX.Element => (
    <main
      ref={ref}
      className={cn(styles.inset, className)}
      {...props}
    />
  ),
);
SidebarInset.displayName = "SidebarInset";

/**
 * Renders a styled input inside sidebar layouts.
 *
 * @remarks
 * - Renders the shared `Input` component
 * - Built for sidebar search and filtering affordances
 *
 * @example
 * ```tsx
 * <SidebarInput placeholder='Search...' />
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/input | HTML input element}
 */
const SidebarInput = React.forwardRef<React.ComponentRef<typeof Input>, SidebarInputProps>(
  ({className, ...props}: Readonly<SidebarInputProps>, ref): React.JSX.Element => (
    <Input
      ref={ref}
      data-sidebar='input'
      className={cn(styles.input, className)}
      {...props}
    />
  ),
);
SidebarInput.displayName = "SidebarInput";

/**
 * Renders the header region of the sidebar.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built as a layout helper for branding or primary controls
 *
 * @example
 * ```tsx
 * <SidebarHeader>Workspace</SidebarHeader>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/div | HTML div element}
 */
const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({className, ...props}: Readonly<SidebarHeaderProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-sidebar='header'
      className={cn(styles.header, className)}
      {...props}
    />
  ),
);
SidebarHeader.displayName = "SidebarHeader";

/**
 * Renders the footer region of the sidebar.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built as a layout helper for actions or account controls
 *
 * @example
 * ```tsx
 * <SidebarFooter>Footer content</SidebarFooter>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/div | HTML div element}
 */
const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({className, ...props}: Readonly<SidebarFooterProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-sidebar='footer'
      className={cn(styles.footer, className)}
      {...props}
    />
  ),
);
SidebarFooter.displayName = "SidebarFooter";

/**
 * Renders a separator between sidebar regions or menu groups.
 *
 * @remarks
 * - Renders the shared `Separator` component
 * - Built as a lightweight structural divider
 *
 * @example
 * ```tsx
 * <SidebarSeparator />
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/hr | HTML thematic break}
 */
const SidebarSeparator = React.forwardRef<React.ComponentRef<typeof Separator>, SidebarSeparatorProps>(
  ({className, ...props}: Readonly<SidebarSeparatorProps>, ref): React.JSX.Element => (
    <Separator
      ref={ref}
      data-sidebar='separator'
      className={cn(styles.separator, className)}
      {...props}
    />
  ),
);
SidebarSeparator.displayName = "SidebarSeparator";

/**
 * Renders the scrollable content region of the sidebar.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built as a layout helper for menu groups and custom content
 *
 * @example
 * ```tsx
 * <SidebarContent>
 *   <SidebarMenu />
 * </SidebarContent>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/div | HTML div element}
 */
const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
  ({className, ...props}: Readonly<SidebarContentProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-sidebar='content'
      className={cn(styles.content, className)}
      {...props}
    />
  ),
);
SidebarContent.displayName = "SidebarContent";

/**
 * Renders a logical grouping container inside the sidebar.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built as a layout helper for related navigation sections
 *
 * @example
 * ```tsx
 * <SidebarGroup>
 *   <SidebarGroupLabel>Projects</SidebarGroupLabel>
 * </SidebarGroup>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/div | HTML div element}
 */
const SidebarGroup = React.forwardRef<HTMLDivElement, SidebarGroupProps>(
  ({className, ...props}: Readonly<SidebarGroupProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-sidebar='group'
      className={cn(styles.group, className)}
      {...props}
    />
  ),
);
SidebarGroup.displayName = "SidebarGroup";

/**
 * Props for the sidebar group label.
 */
export interface SidebarGroupLabelProps extends Readonly<Omit<useRender.ComponentProps<"div", SidebarGroupLabelState>, "ref">> {
  /** Ref to the actual native or composed label element. */
  readonly ref?: React.Ref<HTMLElement>;
  /**
   * Whether to merge props into the single child element instead of rendering a wrapper `<div>`.
   * @default false
   */
  readonly asChild?: boolean;
}

/**
 * Renders the heading label for a sidebar group.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Supports modern `render` and legacy `asChild` composition for custom markup
 *
 * @example
 * ```tsx
 * <SidebarGroupLabel>Projects</SidebarGroupLabel>
 * ```
 *
 * @see {@link https://base-ui.com/react/utils/use-render | Base UI composition}
 */
const SidebarGroupLabel = React.forwardRef<HTMLElement, SidebarGroupLabelProps>(
  (
    {className, asChild = false, children, render, ...props}: Readonly<React.PropsWithoutRef<SidebarGroupLabelProps>>,
    ref,
  ): React.JSX.Element => {
    const child = sidebarLegacyChild(children, asChild);
    return useRender<SidebarGroupLabelState, HTMLElement>({
      defaultTagName: "div",
      ref,
      render: child ?? render,
      state: {},
      props: {
        "data-sidebar": "group-label",
        ...mergeProps<"div">({className: cn(styles.groupLabel, className)}, props, {children: child ? undefined : children}),
      },
    });
  },
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";

/**
 * Props for the sidebar group action button.
 */
export type SidebarGroupActionProps = SidebarControlProps<SidebarGroupActionState>;

/**
 * Renders a secondary action aligned with a sidebar group heading.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Supports modern `render` and legacy `asChild` composition for custom controls
 *
 * @example
 * ```tsx
 * <SidebarGroupAction aria-label='Add project'>+</SidebarGroupAction>
 * ```
 *
 * @see {@link https://base-ui.com/react/utils/use-render | Base UI composition}
 */
const SidebarGroupAction = React.forwardRef<HTMLElement, SidebarGroupActionProps>(
  (
    {
      className,
      asChild = false,
      children,
      render,
      disabled = false,
      nativeButton,
      ...props
    }: Readonly<React.PropsWithoutRef<SidebarGroupActionProps>>,
    ref,
  ): React.JSX.Element => {
    const child = sidebarLegacyChild(children, asChild);
    const renderProp = child ?? render;
    const interactions = useSidebarControlInteractions(
      typeof renderProp === "function" ? undefined : renderProp,
      Boolean(renderProp),
      disabled,
      nativeButton,
    );
    return useRender<SidebarGroupActionState, HTMLElement>({
      defaultTagName: "button",
      ref: [ref, interactions.ref],
      render: renderProp,
      state: {disabled},
      props: {
        "data-sidebar": "group-action",
        ...mergeProps<"button">(interactions.props, {className: cn(styles.groupAction, className)}, props, {
          children: child ? undefined : children,
        }),
      },
    });
  },
);
SidebarGroupAction.displayName = "SidebarGroupAction";

/**
 * Renders the content container for a sidebar group.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built as a structural wrapper for nested menu items or custom content
 *
 * @example
 * ```tsx
 * <SidebarGroupContent>
 *   <SidebarMenu />
 * </SidebarGroupContent>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/div | HTML div element}
 */
const SidebarGroupContent = React.forwardRef<HTMLDivElement, SidebarGroupContentProps>(
  ({className, ...props}: Readonly<SidebarGroupContentProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-sidebar='group-content'
      className={cn(styles.groupContent, className)}
      {...props}
    />
  ),
);
SidebarGroupContent.displayName = "SidebarGroupContent";

/**
 * Renders the root sidebar navigation list.
 *
 * @remarks
 * - Renders a `<ul>` element
 * - Built as the primary menu container for sidebar navigation
 *
 * @example
 * ```tsx
 * <SidebarMenu>
 *   <SidebarMenuItem />
 * </SidebarMenu>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/ul | HTML ul element}
 */
const SidebarMenu = React.forwardRef<HTMLUListElement, SidebarMenuProps>(
  ({className, ...props}: Readonly<SidebarMenuProps>, ref): React.JSX.Element => (
    <ul
      ref={ref}
      data-sidebar='menu'
      className={cn(styles.menu, className)}
      {...props}
    />
  ),
);
SidebarMenu.displayName = "SidebarMenu";

/**
 * Renders a single list item within the sidebar menu.
 *
 * @remarks
 * - Renders an `<li>` element
 * - Built as a structural wrapper for menu buttons and actions
 *
 * @example
 * ```tsx
 * <SidebarMenuItem>
 *   <SidebarMenuButton>Dashboard</SidebarMenuButton>
 * </SidebarMenuItem>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/li | HTML li element}
 */
const SidebarMenuItem = React.forwardRef<HTMLLIElement, SidebarMenuItemProps>(
  ({className, ...props}: Readonly<SidebarMenuItemProps>, ref): React.JSX.Element => (
    <li
      ref={ref}
      data-sidebar='menu-item'
      className={cn(styles.menuItem, className)}
      {...props}
    />
  ),
);
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariantStyles = {
  default: styles.menuButtonDefault,
  outline: styles.menuButtonOutline,
} as const;

const sidebarMenuButtonSizeStyles = {
  default: styles.menuButtonSizeDefault,
  sm: styles.menuButtonSizeSm,
  lg: styles.menuButtonSizeLg,
} as const;

/**
 * Props for the sidebar menu button.
 */
export interface SidebarMenuButtonProps extends SidebarControlProps<SidebarMenuButtonState> {
  /**
   * Whether to merge props into the single child element instead of rendering a wrapper `<button>`.
   * @default false
   */
  readonly asChild?: boolean;
  /**
   * Whether the menu item should be styled as active.
   * @default false
   */
  readonly isActive?: boolean;
  /**
   * Tooltip content displayed when the sidebar is collapsed on desktop.
   * @default undefined
   */
  readonly tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  /**
   * Visual style variant for the menu button.
   * @default "default"
   */
  readonly variant?: keyof typeof sidebarMenuButtonVariantStyles;
  /**
   * Size preset for the menu button.
   * @default "default"
   */
  readonly size?: keyof typeof sidebarMenuButtonSizeStyles;
}

/**
 * Renders the primary interactive element for a sidebar menu item.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Supports modern `render`, legacy `asChild`, and contextual tooltips when collapsed
 *
 * @example
 * ```tsx
 * <SidebarMenuButton isActive>Dashboard</SidebarMenuButton>
 * ```
 *
 * Native anchors retain link semantics, including an empty href. Opaque
 * non-button render targets must specify `nativeButton={false}` and forward
 * their DOM ref; the resolved native target owns navigation classification.
 * Render callbacks receive the wrapper's full state, not Tooltip's or any
 * nested control primitive's state.
 *
 * @see {@link https://base-ui.com/react/utils/use-render | Base UI composition}
 */
const SidebarMenuButton = React.forwardRef<HTMLElement, SidebarMenuButtonProps>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      children,
      render,
      disabled = false,
      nativeButton,
      ...props
    }: Readonly<React.PropsWithoutRef<SidebarMenuButtonProps>>,
    ref,
  ): React.JSX.Element => {
    const {isMobile, state} = useSidebar();
    const child = sidebarLegacyChild(children, asChild);
    const renderProp = child ?? render;
    const interactions = useSidebarControlInteractions(
      typeof renderProp === "function" ? undefined : renderProp,
      Boolean(renderProp),
      disabled,
      nativeButton,
    );
    const button = useRender<SidebarMenuButtonState, HTMLElement>({
      defaultTagName: "button",
      ref: [ref, interactions.ref],
      render: renderProp,
      state: {disabled, isActive, size, variant},
      props: {
        "data-active": isActive,
        "data-sidebar": "menu-button",
        "data-size": size,
        ...mergeProps<"button">(
          interactions.props,
          {className: cn(styles.menuButton, sidebarMenuButtonVariantStyles[variant], sidebarMenuButtonSizeStyles[size], className)},
          props,
          {children: child ? undefined : children},
        ),
      },
    });

    if (!tooltip) {
      return button;
    }

    const resolvedTooltip = typeof tooltip === "string" ? {children: tooltip} : tooltip;

    return (
      <Tooltip disabled={state !== "collapsed" || isMobile}>
        <TooltipTrigger render={button} />
        <TooltipContent
          side='right'
          align='center'
          {...resolvedTooltip}
        />
      </Tooltip>
    );
  },
);
SidebarMenuButton.displayName = "SidebarMenuButton";

/**
 * Props for the sidebar menu action button.
 */
export interface SidebarMenuActionProps extends SidebarControlProps<SidebarMenuActionState> {
  /**
   * Whether to merge props into the single child element instead of rendering a wrapper `<button>`.
   * @default false
   */
  readonly asChild?: boolean;
  /**
   * Whether the action should remain hidden until its parent item is hovered.
   * @default false
   */
  readonly showOnHover?: boolean;
}

/**
 * Renders a secondary action button aligned within a sidebar menu item.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Supports modern `render` and legacy `asChild` composition for custom controls
 *
 * @example
 * ```tsx
 * <SidebarMenuAction showOnHover>⋯</SidebarMenuAction>
 * ```
 *
 * Open-state attributes from an owning popover/menu remain on the actual
 * trigger, keeping showOnHover actions visible while their content is portaled.
 *
 * @see {@link https://base-ui.com/react/utils/use-render | Base UI composition}
 */
const SidebarMenuAction = React.forwardRef<HTMLElement, SidebarMenuActionProps>(
  (
    {
      className,
      asChild = false,
      showOnHover = false,
      children,
      render,
      disabled = false,
      nativeButton,
      ...props
    }: Readonly<React.PropsWithoutRef<SidebarMenuActionProps>>,
    ref,
  ): React.JSX.Element => {
    const child = sidebarLegacyChild(children, asChild);
    const renderProp = child ?? render;
    const interactions = useSidebarControlInteractions(
      typeof renderProp === "function" ? undefined : renderProp,
      Boolean(renderProp),
      disabled,
      nativeButton,
    );
    return useRender<SidebarMenuActionState, HTMLElement>({
      defaultTagName: "button",
      ref: [ref, interactions.ref],
      render: renderProp,
      state: {disabled, showOnHover},
      props: {
        "data-sidebar": "menu-action",
        ...mergeProps<"button">(
          interactions.props,
          {className: cn(styles.menuAction, showOnHover && styles.menuActionShowOnHover, className)},
          props,
          {children: child ? undefined : children},
        ),
      },
    });
  },
);
SidebarMenuAction.displayName = "SidebarMenuAction";

/**
 * Renders a badge alongside a sidebar menu item.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built as a lightweight presentational helper for counts and statuses
 *
 * @example
 * ```tsx
 * <SidebarMenuBadge>3</SidebarMenuBadge>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/div | HTML div element}
 */
const SidebarMenuBadge = React.forwardRef<HTMLDivElement, SidebarMenuBadgeProps>(
  ({className, ...props}: Readonly<SidebarMenuBadgeProps>, ref): React.JSX.Element => (
    <div
      ref={ref}
      data-sidebar='menu-badge'
      className={cn(styles.menuBadge, className)}
      {...props}
    />
  ),
);
SidebarMenuBadge.displayName = "SidebarMenuBadge";

/**
 * Props for the sidebar menu skeleton.
 */
export interface SidebarMenuSkeletonProps extends Readonly<React.ComponentPropsWithRef<"div">> {
  /**
   * Whether to render a leading skeleton icon placeholder.
   * @default false
   */
  readonly showIcon?: boolean;
}

/**
 * Renders a loading placeholder for sidebar menu items.
 *
 * @remarks
 * - Renders a `<div>` element
 * - Built from shared `Skeleton` primitives
 *
 * @example
 * ```tsx
 * <SidebarMenuSkeleton showIcon />
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/div | HTML div element}
 */
const SidebarMenuSkeleton = React.forwardRef<HTMLDivElement, SidebarMenuSkeletonProps>(
  ({className, showIcon = false, ...props}: Readonly<SidebarMenuSkeletonProps>, ref): React.JSX.Element => {
    return (
      <div
        ref={ref}
        data-sidebar='menu-skeleton'
        className={cn(styles.menuSkeleton, className)}
        {...props}>
        {Boolean(showIcon) && (
          <Skeleton
            className={styles.menuSkeletonIcon}
            data-sidebar='menu-skeleton-icon'
          />
        )}
        <Skeleton
          className={styles.menuSkeletonText}
          data-sidebar='menu-skeleton-text'
        />
      </div>
    );
  },
);
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";

/**
 * Renders a nested menu list within the sidebar.
 *
 * @remarks
 * - Renders a `<ul>` element
 * - Built for multi-level navigation structures
 *
 * @example
 * ```tsx
 * <SidebarMenuSub>
 *   <SidebarMenuSubItem />
 * </SidebarMenuSub>
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/ul | HTML ul element}
 */
const SidebarMenuSub = React.forwardRef<HTMLUListElement, SidebarMenuSubProps>(
  ({className, ...props}: Readonly<SidebarMenuSubProps>, ref): React.JSX.Element => (
    <ul
      ref={ref}
      data-sidebar='menu-sub'
      className={cn(styles.menuSub, className)}
      {...props}
    />
  ),
);
SidebarMenuSub.displayName = "SidebarMenuSub";

/**
 * Renders a single nested sidebar menu list item.
 *
 * @remarks
 * - Renders an `<li>` element
 * - Built as a structural wrapper for nested menu links
 *
 * @example
 * ```tsx
 * <SidebarMenuSubItem />
 * ```
 *
 * @see {@link https://developer.mozilla.org/docs/Web/HTML/Element/li | HTML li element}
 */
const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, SidebarMenuSubItemProps>(
  (props: Readonly<SidebarMenuSubItemProps>, ref): React.JSX.Element => (
    <li
      ref={ref}
      data-sidebar='menu-sub-item'
      {...props}
    />
  ),
);
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

/**
 * Props for the sidebar nested menu button.
 */
export interface SidebarMenuSubButtonProps extends Readonly<Omit<useRender.ComponentProps<"a", SidebarMenuSubButtonState>, "ref">> {
  /** Ref to the actual native or composed link element. */
  readonly ref?: React.Ref<HTMLElement>;
  /**
   * Whether to merge props into the single child element instead of rendering a wrapper `<a>`.
   * @default false
   */
  readonly asChild?: boolean;
  /**
   * Size preset for the nested menu link.
   * @default "md"
   */
  readonly size?: "sm" | "md";
  /**
   * Whether the nested menu item should be styled as active.
   * @default undefined
   */
  readonly isActive?: boolean;
}

/**
 * Renders a nested sidebar menu link.
 *
 * @remarks
 * - Renders an `<a>` element by default
 * - Supports modern `render` and legacy `asChild` composition for custom link components
 *
 * @example
 * ```tsx
 * <SidebarMenuSubButton href='/settings/profile'>Profile</SidebarMenuSubButton>
 * ```
 *
 * @see {@link https://base-ui.com/react/utils/use-render | Base UI composition}
 */
const SidebarMenuSubButton = React.forwardRef<HTMLElement, SidebarMenuSubButtonProps>(
  (
    {
      asChild = false,
      size = "md",
      isActive = false,
      className,
      children,
      render,
      ...props
    }: Readonly<React.PropsWithoutRef<SidebarMenuSubButtonProps>>,
    ref,
  ): React.JSX.Element => {
    const child = sidebarLegacyChild(children, asChild);
    return useRender<SidebarMenuSubButtonState, HTMLElement>({
      defaultTagName: "a",
      ref,
      render: child ?? render,
      state: {isActive, size},
      props: {
        "data-active": isActive,
        "data-sidebar": "menu-sub-button",
        "data-size": size,
        ...mergeProps<"a">(
          {className: cn(styles.menuSubButton, size === "sm" ? styles.menuSubButtonSm : styles.menuSubButtonMd, className)},
          props,
          {children: child ? undefined : children},
        ),
      },
    });
  },
);
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarProvider {
  export type Props = Readonly<SidebarProviderProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace Sidebar {
  export type Props = Readonly<SidebarProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarTrigger {
  export type Props = Readonly<SidebarTriggerProps>;
  export type State = Button.State;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarRail {
  export type Props = Readonly<SidebarRailProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarInset {
  export type Props = Readonly<SidebarInsetProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarInput {
  export type Props = Readonly<SidebarInputProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarHeader {
  export type Props = Readonly<SidebarHeaderProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarFooter {
  export type Props = Readonly<SidebarFooterProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarSeparator {
  export type Props = Readonly<SidebarSeparatorProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarContent {
  export type Props = Readonly<SidebarContentProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarGroup {
  export type Props = Readonly<SidebarGroupProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarGroupLabel {
  export type Props = Readonly<SidebarGroupLabelProps>;
  export type State = Readonly<SidebarGroupLabelState>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarGroupAction {
  export type Props = Readonly<SidebarGroupActionProps>;
  export type State = Readonly<SidebarGroupActionState>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarGroupContent {
  export type Props = Readonly<SidebarGroupContentProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarMenu {
  export type Props = Readonly<SidebarMenuProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarMenuItem {
  export type Props = Readonly<SidebarMenuItemProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarMenuButton {
  export type Props = Readonly<SidebarMenuButtonProps>;
  export type State = Readonly<SidebarMenuButtonState>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarMenuAction {
  export type Props = Readonly<SidebarMenuActionProps>;
  export type State = Readonly<SidebarMenuActionState>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarMenuBadge {
  export type Props = Readonly<SidebarMenuBadgeProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarMenuSkeleton {
  export type Props = Readonly<SidebarMenuSkeletonProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarMenuSub {
  export type Props = Readonly<SidebarMenuSubProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarMenuSubItem {
  export type Props = Readonly<SidebarMenuSubItemProps>;
}
// eslint-disable-next-line no-redeclare -- public component namespace typing API
namespace SidebarMenuSubButton {
  export type Props = Readonly<SidebarMenuSubButtonProps>;
  export type State = Readonly<SidebarMenuSubButtonState>;
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
