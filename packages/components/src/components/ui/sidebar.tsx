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
 */
function useSidebar(): SidebarContextProps {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }

  return context;
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(({defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props}, ref) => {
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
});
SidebarProvider.displayName = "SidebarProvider";

type SidebarProps = React.ComponentProps<"div"> & {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
};

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

const SidebarInset = React.forwardRef<HTMLDivElement, React.ComponentProps<"main">>(({className, ...props}, ref) => (
  <main
    ref={ref}
    className={cn(styles.inset, className)}
    {...props}
  />
));
SidebarInset.displayName = "SidebarInset";

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

const SidebarHeader = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-sidebar='header'
    className={cn(styles.header, className)}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-sidebar='footer'
    className={cn(styles.footer, className)}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

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

const SidebarContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-sidebar='content'
    className={cn(styles.content, className)}
    {...props}
  />
));
SidebarContent.displayName = "SidebarContent";

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

const SidebarGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentProps<"div"> & {asChild?: boolean}>(
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

const SidebarGroupAction = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button"> & {asChild?: boolean}>(
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

const SidebarGroupContent = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-sidebar='group-content'
    className={cn(styles.groupContent, className)}
    {...props}
  />
));
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({className, ...props}, ref) => (
  <ul
    ref={ref}
    data-sidebar='menu'
    className={cn(styles.menu, className)}
    {...props}
  />
));
SidebarMenu.displayName = "SidebarMenu";

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

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    /** @deprecated Prefer Base UI's `render` prop. */

    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
    variant?: keyof typeof sidebarMenuButtonVariantStyles;
    size?: keyof typeof sidebarMenuButtonSizeStyles;
  }
>(({asChild = false, isActive = false, variant = "default", size = "default", tooltip, className, children, ...props}, ref) => {
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
});
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    /** @deprecated Prefer Base UI's `render` prop. */

    asChild?: boolean;
    showOnHover?: boolean;
  }
>(({className, asChild = false, showOnHover = false, children, ...props}, ref) => {
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
});
SidebarMenuAction.displayName = "SidebarMenuAction";

const SidebarMenuBadge = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(({className, ...props}, ref) => (
  <div
    ref={ref}
    data-sidebar='menu-badge'
    className={cn(styles.menuBadge, className)}
    {...props}
  />
));
SidebarMenuBadge.displayName = "SidebarMenuBadge";

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    showIcon?: boolean;
  }
>(({className, showIcon = false, ...props}, ref) => {
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

const SidebarMenuSub = React.forwardRef<HTMLUListElement, React.ComponentProps<"ul">>(({className, ...props}, ref) => (
  <ul
    ref={ref}
    data-sidebar='menu-sub'
    className={cn(styles.menuSub, className)}
    {...props}
  />
));
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, React.ComponentProps<"li">>((props, ref) => (
  <li
    ref={ref}
    {...props}
  />
));
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    /** @deprecated Prefer Base UI's `render` prop. */

    asChild?: boolean;
    size?: "sm" | "md";
    isActive?: boolean;
  }
>(({asChild = false, size = "md", isActive, className, children, ...props}, ref) => {
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
});
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
