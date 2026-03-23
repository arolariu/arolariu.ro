/* eslint-disable max-lines */
"use client";

import {PanelLeft} from "lucide-react";
import * as React from "react";
import {createPortal} from "react-dom";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Separator} from "@/components/ui/separator";
import {Skeleton} from "@/components/ui/skeleton";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import {useIsMobile} from "@/hooks/useIsMobile";
import {cn} from "@/lib/utilities";

import styles from "./sidebar.module.css";

const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarDataAttributes = Record<`data-${string}`, string | boolean | undefined>;
type SidebarCloneableDivProps = React.ComponentProps<"div"> & SidebarDataAttributes & {ref?: React.Ref<HTMLDivElement>};
type SidebarCloneableButtonProps = React.ComponentProps<"button"> & SidebarDataAttributes & {ref?: React.Ref<HTMLButtonElement>};
type SidebarCloneableAnchorProps = React.ComponentProps<"a"> & SidebarDataAttributes & {ref?: React.Ref<HTMLAnchorElement>};

type SidebarContextProps = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

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
interface SidebarProviderProps extends React.ComponentProps<"div"> {
  /**
   * Initial uncontrolled open state for desktop layouts.
   * @default true
   */
  defaultOpen?: boolean;
  /**
   * Controlled open state for desktop layouts.
   * @default undefined
   */
  open?: boolean;
  /**
   * Callback invoked when the desktop open state changes.
   * @default undefined
   */
  onOpenChange?: (open: boolean) => void;
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
  ({defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props}, ref) => {
    const isMobile = useIsMobile();
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
        if (event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
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
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider>
          <div
            ref={ref}
            style={
              {
                "--ac-sidebar-width": SIDEBAR_WIDTH,
                "--ac-sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                ...style,
              } as React.CSSProperties
            }
            className={cn(styles.wrapper, className)}
            {...props}>
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  },
);
SidebarProvider.displayName = "SidebarProvider";

/**
 * Props for the root sidebar panel.
 */
type SidebarProps = React.ComponentProps<"div"> & {
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
};

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
  ({side = "left", variant = "sidebar", collapsible = "offcanvas", className, children, ...props}, ref) => {
    const {isMobile, openMobile, setOpenMobile, state} = useSidebar();

    if (collapsible === "none") {
      return (
        <div
          ref={ref}
          className={cn(styles.staticSidebar, className)}
          {...props}>
          {children}
        </div>
      );
    }

    if (isMobile) {
      return (
        <MobileSidebarPortal
          className={className}
          open={openMobile}
          side={side}
          onOpenChange={setOpenMobile}
          {...props}>
          {children}
        </MobileSidebarPortal>
      );
    }

    return (
      <div
        ref={ref}
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
    );
  },
);
Sidebar.displayName = "Sidebar";

type MobileSidebarPortalProps = React.ComponentProps<"div"> & {
  open: boolean;
  side: "left" | "right";
  onOpenChange: (open: boolean) => void;
};

function MobileSidebarPortal({
  open,
  side,
  onOpenChange,
  className,
  children,
  ...props
}: Readonly<MobileSidebarPortalProps>): React.ReactPortal | null {
  React.useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.body.style.overflow = "hidden";
    globalThis.window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      globalThis.window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className={styles.mobilePortal}>
      <button
        type='button'
        aria-label='Close sidebar'
        className={styles.mobileOverlay}
        onClick={() => onOpenChange(false)}
      />
      <div
        role='dialog'
        aria-modal='true'
        aria-label='Sidebar'
        data-sidebar='sidebar'
        className={cn(styles.mobilePanel, side === "right" ? styles.mobilePanelRight : styles.mobilePanelLeft, className)}
        style={{"--ac-sidebar-width": SIDEBAR_WIDTH_MOBILE} as React.CSSProperties}
        {...props}>
        <div className={styles.srOnly}>
          <h2>Sidebar</h2>
          <p>Displays the mobile sidebar.</p>
        </div>
        <div className={styles.mobileContent}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

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
const SidebarTrigger = React.forwardRef<React.ComponentRef<typeof Button>, React.ComponentProps<typeof Button>>(
  ({className, onClick, ...props}, ref) => {
    const {toggleSidebar} = useSidebar();

    return (
      <Button
        ref={ref}
        data-sidebar='trigger'
        variant='ghost'
        size='icon'
        className={cn(styles.trigger, className)}
        onClick={(event) => {
          onClick?.(event);
          toggleSidebar();
        }}
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
const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button">>(({className, ...props}, ref) => {
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
      onClick={toggleSidebar}
      {...props}
    />
  );
});
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
const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<"main">>(({className, ...props}, ref) => (
  <main
    ref={ref}
    className={cn(styles.inset, className)}
    {...props}
  />
));
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
const SidebarInput = React.forwardRef<React.ComponentRef<typeof Input>, React.ComponentProps<typeof Input>>(
  ({className, ...props}, ref) => (
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
const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-sidebar='header'
    className={cn(styles.header, className)}
    {...props}
  />
));
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
const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-sidebar='footer'
    className={cn(styles.footer, className)}
    {...props}
  />
));
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
const SidebarSeparator = React.forwardRef<React.ComponentRef<typeof Separator>, React.ComponentProps<typeof Separator>>(
  ({className, ...props}, ref) => (
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
const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-sidebar='content'
    className={cn(styles.content, className)}
    {...props}
  />
));
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
const SidebarGroup = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-sidebar='group'
    className={cn(styles.group, className)}
    {...props}
  />
));
SidebarGroup.displayName = "SidebarGroup";

function cloneSidebarChild<TProps extends {className?: string}>(children: React.ReactNode, mergedProps: TProps): React.JSX.Element | null {
  if (!React.isValidElement(children)) {
    return null;
  }

  const child = children as React.ReactElement<TProps>;

  // eslint-disable-next-line react-x/no-clone-element -- replaces Radix Slot while preserving asChild prop merging
  return React.cloneElement(child, {
    ...mergedProps,
    className: cn(mergedProps.className, child.props.className),
  });
}

/**
 * Props for the sidebar group label.
 */
interface SidebarGroupLabelProps extends React.ComponentProps<"div"> {
  /**
   * Whether to merge props into the single child element instead of rendering a wrapper `<div>`.
   * @default false
   */
  asChild?: boolean;
}

/**
 * Renders the heading label for a sidebar group.
 *
 * @remarks
 * - Renders a `<div>` element by default
 * - Supports `asChild` composition for custom markup
 *
 * @example
 * ```tsx
 * <SidebarGroupLabel>Projects</SidebarGroupLabel>
 * ```
 *
 * @see {@link https://react.dev/reference/react/cloneElement | React cloneElement Docs}
 */
const SidebarGroupLabel = React.forwardRef<HTMLDivElement, SidebarGroupLabelProps>(
  ({className, asChild = false, children, ...props}, ref) => {
    const mergedProps: SidebarCloneableDivProps = {
      ...props,
      children,
      className: cn(styles.groupLabel, className),
      "data-sidebar": "group-label",
      ref,
    };

    if (asChild) {
      const clonedChild = cloneSidebarChild(children, mergedProps);

      if (clonedChild) {
        return clonedChild;
      }
    }

    return <div {...mergedProps} />;
  },
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";

/**
 * Props for the sidebar group action button.
 */
interface SidebarGroupActionProps extends React.ComponentProps<"button"> {
  /**
   * Whether to merge props into the single child element instead of rendering a wrapper `<button>`.
   * @default false
   */
  asChild?: boolean;
}

/**
 * Renders a secondary action aligned with a sidebar group heading.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Supports `asChild` composition for custom controls
 *
 * @example
 * ```tsx
 * <SidebarGroupAction aria-label='Add project'>+</SidebarGroupAction>
 * ```
 *
 * @see {@link https://react.dev/reference/react/cloneElement | React cloneElement Docs}
 */
const SidebarGroupAction = React.forwardRef<HTMLButtonElement, SidebarGroupActionProps>(
  ({className, asChild = false, children, ...props}, ref) => {
    const mergedProps: SidebarCloneableButtonProps = {
      ...props,
      children,
      className: cn(styles.groupAction, className),
      "data-sidebar": "group-action",
      ref,
      type: props.type ?? "button",
    };

    if (asChild) {
      const clonedChild = cloneSidebarChild(children, mergedProps);

      if (clonedChild) {
        return clonedChild;
      }
    }

    return (
      <button
        type={props.type === "submit" ? "submit" : props.type === "reset" ? "reset" : "button"}
        {...mergedProps}
      />
    );
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
const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-sidebar='group-content'
    className={cn(styles.groupContent, className)}
    {...props}
  />
));
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
const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({className, ...props}, ref) => (
  <ul
    ref={ref}
    data-sidebar='menu'
    className={cn(styles.menu, className)}
    {...props}
  />
));
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
const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>(({className, ...props}, ref) => (
  <li
    ref={ref}
    data-sidebar='menu-item'
    className={cn(styles.menuItem, className)}
    {...props}
  />
));
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
interface SidebarMenuButtonProps extends React.ComponentProps<"button"> {
  /**
   * Whether to merge props into the single child element instead of rendering a wrapper `<button>`.
   * @default false
   */
  asChild?: boolean;
  /**
   * Whether the menu item should be styled as active.
   * @default false
   */
  isActive?: boolean;
  /**
   * Tooltip content displayed when the sidebar is collapsed on desktop.
   * @default undefined
   */
  tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  /**
   * Visual style variant for the menu button.
   * @default "default"
   */
  variant?: keyof typeof sidebarMenuButtonVariantStyles;
  /**
   * Size preset for the menu button.
   * @default "default"
   */
  size?: keyof typeof sidebarMenuButtonSizeStyles;
}

/**
 * Renders the primary interactive element for a sidebar menu item.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Supports `asChild` composition and contextual tooltips when collapsed
 *
 * @example
 * ```tsx
 * <SidebarMenuButton isActive>Dashboard</SidebarMenuButton>
 * ```
 *
 * @see {@link https://react.dev/reference/react/cloneElement | React cloneElement Docs}
 */
const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, children, ...props}, ref) => {
    const {isMobile, state} = useSidebar();
    const mergedProps: SidebarCloneableButtonProps = {
      ...props,
      children,
      className: cn(styles.menuButton, sidebarMenuButtonVariantStyles[variant], sidebarMenuButtonSizeStyles[size], className),
      "data-active": isActive,
      "data-sidebar": "menu-button",
      "data-size": size,
      ref,
      type: props.type ?? "button",
    };
    const clonedChild = asChild ? cloneSidebarChild(children, mergedProps) : null;

    const button = clonedChild ?? (
      <button
        type={props.type === "submit" ? "submit" : props.type === "reset" ? "reset" : "button"}
        {...mergedProps}
      />
    );

    if (!tooltip) {
      return button;
    }

    const resolvedTooltip = typeof tooltip === "string" ? {children: tooltip} : tooltip;

    return (
      <Tooltip>
        <TooltipTrigger render={button as React.ReactElement} />
        <TooltipContent
          hidden={state !== "collapsed" || isMobile}
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
interface SidebarMenuActionProps extends React.ComponentProps<"button"> {
  /**
   * Whether to merge props into the single child element instead of rendering a wrapper `<button>`.
   * @default false
   */
  asChild?: boolean;
  /**
   * Whether the action should remain hidden until its parent item is hovered.
   * @default false
   */
  showOnHover?: boolean;
}

/**
 * Renders a secondary action button aligned within a sidebar menu item.
 *
 * @remarks
 * - Renders a `<button>` element by default
 * - Supports `asChild` composition for custom controls
 *
 * @example
 * ```tsx
 * <SidebarMenuAction showOnHover>⋯</SidebarMenuAction>
 * ```
 *
 * @see {@link https://react.dev/reference/react/cloneElement | React cloneElement Docs}
 */
const SidebarMenuAction = React.forwardRef<HTMLButtonElement, SidebarMenuActionProps>(
  ({className, asChild = false, showOnHover = false, children, ...props}, ref) => {
    const mergedProps: SidebarCloneableButtonProps = {
      ...props,
      children,
      className: cn(styles.menuAction, showOnHover && styles.menuActionShowOnHover, className),
      "data-sidebar": "menu-action",
      ref,
      type: props.type ?? "button",
    };

    if (asChild) {
      const clonedChild = cloneSidebarChild(children, mergedProps);

      if (clonedChild) {
        return clonedChild;
      }
    }

    return (
      <button
        type={props.type === "submit" ? "submit" : props.type === "reset" ? "reset" : "button"}
        {...mergedProps}
      />
    );
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
const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-sidebar='menu-badge'
    className={cn(styles.menuBadge, className)}
    {...props}
  />
));
SidebarMenuBadge.displayName = "SidebarMenuBadge";

/**
 * Props for the sidebar menu skeleton.
 */
interface SidebarMenuSkeletonProps extends React.ComponentProps<"div"> {
  /**
   * Whether to render a leading skeleton icon placeholder.
   * @default false
   */
  showIcon?: boolean;
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
const SidebarMenuSkeleton = React.forwardRef<HTMLDivElement, SidebarMenuSkeletonProps>(({className, showIcon = false, ...props}, ref) => {
  const width = React.useMemo(() => `${Math.floor(Math.random() * 40) + 50}%`, []);

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
        style={{"--ac-skeleton-width": width} as React.CSSProperties}
      />
    </div>
  );
});
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
const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({className, ...props}, ref) => (
  <ul
    ref={ref}
    data-sidebar='menu-sub'
    className={cn(styles.menuSub, className)}
    {...props}
  />
));
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
const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>((props, ref) => (
  <li
    ref={ref}
    {...props}
  />
));
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

/**
 * Props for the sidebar nested menu button.
 */
interface SidebarMenuSubButtonProps extends React.ComponentProps<"a"> {
  /**
   * Whether to merge props into the single child element instead of rendering a wrapper `<a>`.
   * @default false
   */
  asChild?: boolean;
  /**
   * Size preset for the nested menu link.
   * @default "md"
   */
  size?: "sm" | "md";
  /**
   * Whether the nested menu item should be styled as active.
   * @default undefined
   */
  isActive?: boolean;
}

/**
 * Renders a nested sidebar menu link.
 *
 * @remarks
 * - Renders an `<a>` element by default
 * - Supports `asChild` composition for custom link components
 *
 * @example
 * ```tsx
 * <SidebarMenuSubButton href='/settings/profile'>Profile</SidebarMenuSubButton>
 * ```
 *
 * @see {@link https://react.dev/reference/react/cloneElement | React cloneElement Docs}
 */
const SidebarMenuSubButton = React.forwardRef<HTMLAnchorElement, SidebarMenuSubButtonProps>(
  ({asChild = false, size = "md", isActive, className, children, ...props}, ref) => {
    const mergedProps: SidebarCloneableAnchorProps = {
      ...props,
      children,
      className: cn(styles.menuSubButton, size === "sm" ? styles.menuSubButtonSm : styles.menuSubButtonMd, className),
      "data-active": isActive,
      "data-sidebar": "menu-sub-button",
      "data-size": size,
      ref,
    };

    if (asChild) {
      const clonedChild = cloneSidebarChild(children, mergedProps);

      if (clonedChild) {
        return clonedChild;
      }
    }

    return <a {...mergedProps}>{children}</a>;
  },
);
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

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
