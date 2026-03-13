"use client";

/* eslint-disable react/no-children-prop, react-x/no-children-for-each, react-x/no-children-map, react-x/no-children-to-array, react-x/no-clone-element, sonarjs/function-return-type, sonarjs/no-identical-functions, sonarjs/no-unused-vars, max-lines, unicorn/no-array-callback-reference, unicorn/no-useless-undefined, unicorn/prefer-at, unicorn/prefer-dom-node-dataset, jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */

import {Drawer as BaseDrawer} from "@base-ui/react/drawer";
import {Menu as BaseMenu} from "@base-ui/react/menu";
import {ChevronLeftIcon, ChevronRightIcon} from "lucide-react";
import {AnimatePresence, motion, type Transition} from "motion/react";
import * as React from "react";

import {useIsMobile} from "@/hooks/useIsMobile";
import {cn} from "@/lib/utilities";
import styles from "./dropdrawer.module.css";

const MOBILE_MENU_TITLE = "Menu";
const MOBILE_SUBMENU_TITLE = "Submenu";
const MOBILE_BACK_LABEL = "Go back";

interface DropDrawerContextValue {
  isMobile: boolean;
}

const DropDrawerContext = React.createContext<DropDrawerContextValue | null>(null);

const useDropDrawerContext = (): DropDrawerContextValue => {
  const context = React.useContext(DropDrawerContext);

  if (context === null) {
    throw new Error("DropDrawer components cannot be rendered outside the Context");
  }

  return context;
};

const Drawer = BaseDrawer.Root;
const DrawerPortal = BaseDrawer.Portal;

const DrawerTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Trigger> & {asChild?: boolean}>(
  ({asChild = false, children, className, ...props}, ref) => {
    if (asChild && React.isValidElement(children)) {
      return (
        <BaseDrawer.Trigger
          ref={ref}
          className={className}
          render={children as React.ReactElement}
          {...props}
        />
      );
    }

    return (
      <BaseDrawer.Trigger
        ref={ref}
        className={className}
        {...props}>
        {children}
      </BaseDrawer.Trigger>
    );
  },
);
DrawerTrigger.displayName = "DrawerTrigger";

const DrawerOverlay = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Backdrop>>(
  ({className, ...props}, ref) => (
    <BaseDrawer.Backdrop
      ref={ref}
      className={cn(styles.drawerOverlay, className)}
      {...props}
    />
  ),
);
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseDrawer.Popup> & {children?: React.ReactNode}
>(({className, children, ...props}, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <BaseDrawer.Viewport className={styles.drawerViewport}>
      <BaseDrawer.Popup
        ref={ref}
        className={cn(styles.drawerContent, className)}
        {...props}>
        <div className={styles.drawerHandle} />
        <BaseDrawer.Content className={styles.drawerInnerContent}>{children}</BaseDrawer.Content>
      </BaseDrawer.Popup>
    </BaseDrawer.Viewport>
  </DrawerPortal>
));
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.drawerHeader, className)}
    {...props}
  />
));
DrawerHeader.displayName = "DrawerHeader";

const DrawerFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({className, ...props}, ref) => (
  <div
    ref={ref}
    className={cn(styles.drawerFooter, className)}
    {...props}
  />
));
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<typeof BaseDrawer.Title>>(
  ({className, ...props}, ref) => (
    <BaseDrawer.Title
      ref={ref}
      className={cn(styles.drawerTitle, className)}
      {...props}
    />
  ),
);
DrawerTitle.displayName = "DrawerTitle";

const DropdownMenu = BaseMenu.Root;
const DropdownMenuSub = BaseMenu.SubmenuRoot;

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Trigger> & {asChild?: boolean}
>(({asChild = false, children, className, ...props}, ref) => {
  if (asChild && React.isValidElement(children)) {
    return (
      <BaseMenu.Trigger
        ref={ref}
        className={className}
        render={children as React.ReactElement}
        {...props}
      />
    );
  }

  return (
    <BaseMenu.Trigger
      ref={ref}
      className={className}
      {...props}>
      {children}
    </BaseMenu.Trigger>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Positioner> & {children?: React.ReactNode}
>(({className, children, ...props}, ref) => (
  <BaseMenu.Portal>
    <BaseMenu.Positioner
      className={styles.dropdownPositioner}
      {...props}>
      <BaseMenu.Popup
        ref={ref}
        className={cn(styles.dropdownContent, className)}>
        {children}
      </BaseMenu.Popup>
    </BaseMenu.Positioner>
  </BaseMenu.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

interface DropdownMenuItemProps extends React.ComponentPropsWithoutRef<typeof BaseMenu.Item> {
  /** @deprecated Prefer Base UI's `render` prop. */

  asChild?: boolean;
  inset?: boolean;
}

const DropdownMenuItem = React.forwardRef<HTMLElement, DropdownMenuItemProps>(
  ({asChild = false, className, inset = false, children, ...props}, ref) => {
    const composedClassName = cn(styles.desktopItem, inset && styles.inset, className);

    if (asChild && React.isValidElement(children)) {
      return (
        <BaseMenu.Item
          ref={ref}
          className={composedClassName}
          render={children as React.ReactElement}
          {...props}
        />
      );
    }

    return (
      <BaseMenu.Item
        ref={ref}
        className={composedClassName}
        {...props}>
        {children}
      </BaseMenu.Item>
    );
  },
);
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel>>(
  ({className, ...props}, ref) => (
    <BaseMenu.GroupLabel
      ref={ref}
      className={cn(styles.desktopLabel, className)}
      {...props}
    />
  ),
);
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseMenu.Separator>>(
  ({className, ...props}, ref) => (
    <BaseMenu.Separator
      ref={ref}
      className={cn(styles.desktopSeparator, className)}
      {...props}
    />
  ),
);
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

const DropdownMenuSubTrigger = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.SubmenuTrigger> & {inset?: boolean}
>(({className, inset = false, children, ...props}, ref) => (
  <BaseMenu.SubmenuTrigger
    ref={ref}
    className={cn(styles.desktopSubTrigger, inset && styles.inset, className)}
    {...props}>
    {children}
    <ChevronRightIcon className={styles.chevron} />
  </BaseMenu.SubmenuTrigger>
));
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

const DropdownMenuSubContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Positioner> & {children?: React.ReactNode}
>(({className, children, ...props}, ref) => (
  <BaseMenu.Positioner
    className={styles.dropdownPositioner}
    {...props}>
    <BaseMenu.Popup
      ref={ref}
      className={cn(styles.dropdownSubContent, className)}>
      {children}
    </BaseMenu.Popup>
  </BaseMenu.Positioner>
));
DropdownMenuSubContent.displayName = "DropdownMenuSubContent";

type DropDrawerRootProps = React.ComponentProps<typeof Drawer> | React.ComponentProps<typeof DropdownMenu>;
type DropDrawerTriggerProps =
  | React.ComponentPropsWithoutRef<typeof DrawerTrigger>
  | React.ComponentPropsWithoutRef<typeof DropdownMenuTrigger>;
type DropDrawerContentProps =
  | React.ComponentPropsWithoutRef<typeof DrawerContent>
  | React.ComponentPropsWithoutRef<typeof DropdownMenuContent>;

interface MobileSubmenuDataAttributes {
  "data-parent-submenu-id"?: string;
  "data-parent-submenu"?: string;
  "data-submenu-id"?: string;
}

interface SharedDropDrawerItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseMenu.Item>, "children" | "onClick" | "onSelect">, MobileSubmenuDataAttributes {
  children?: React.ReactNode;
  className?: string;
  closeOnClick?: boolean;
  icon?: React.ReactNode;
  inset?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
  onSelect?: (event: Event) => void;
}

interface SubmenuContextType {
  activeSubmenu: string | null;
  navigateToSubmenu?: (id: string, title: string) => void;
  registerSubmenuContent?: (id: string, content: ReadonlyArray<React.ReactNode>) => void;
  setActiveSubmenu: (id: string | null) => void;
  setSubmenuTitle: (title: string | null) => void;
  submenuTitle: string | null;
}

const SubmenuContext = React.createContext<SubmenuContextType>({
  activeSubmenu: null,
  navigateToSubmenu: undefined,
  registerSubmenuContent: undefined,
  setActiveSubmenu: () => undefined,
  setSubmenuTitle: () => undefined,
  submenuTitle: null,
});

function DropDrawer({children, ...props}: DropDrawerRootProps): React.JSX.Element {
  const isMobile = useIsMobile();

  return (
    <DropDrawerContext.Provider value={{isMobile}}>
      {isMobile ? (
        <Drawer
          data-slot='drop-drawer'
          {...(props as React.ComponentProps<typeof Drawer>)}>
          {children}
        </Drawer>
      ) : (
        <DropdownMenu
          data-slot='drop-drawer'
          {...(props as React.ComponentProps<typeof DropdownMenu>)}>
          {children}
        </DropdownMenu>
      )}
    </DropDrawerContext.Provider>
  );
}

function DropDrawerTrigger({className, children, ...props}: DropDrawerTriggerProps): React.JSX.Element {
  const {isMobile} = useDropDrawerContext();

  return isMobile ? (
    <DrawerTrigger
      data-slot='drop-drawer-trigger'
      className={className}
      {...(props as React.ComponentProps<typeof DrawerTrigger>)}>
      {children}
    </DrawerTrigger>
  ) : (
    <DropdownMenuTrigger
      data-slot='drop-drawer-trigger'
      className={className}
      {...(props as React.ComponentProps<typeof DropdownMenuTrigger>)}>
      {children}
    </DropdownMenuTrigger>
  );
}

function DropDrawerContent({className, children, ...props}: DropDrawerContentProps): React.JSX.Element {
  const {isMobile} = useDropDrawerContext();
  const [activeSubmenu, setActiveSubmenu] = React.useState<string | null>(null);
  const [submenuTitle, setSubmenuTitle] = React.useState<string | null>(null);
  const [submenuStack, setSubmenuStack] = React.useState<ReadonlyArray<{id: string; title: string}>>([]);
  const [animationDirection, setAnimationDirection] = React.useState<"forward" | "backward">("forward");
  const submenuContentRef = React.useRef(new Map<string, ReadonlyArray<React.ReactNode>>());

  React.useEffect(() => {
    submenuContentRef.current.clear();
  }, [children]);

  const navigateToSubmenu = React.useCallback((id: string, title: string): void => {
    setAnimationDirection("forward");
    setActiveSubmenu(id);
    setSubmenuTitle(title);
    setSubmenuStack((previousStack) => [...previousStack, {id, title}]);
  }, []);

  const goBack = React.useCallback((): void => {
    setAnimationDirection("backward");

    if (submenuStack.length <= 1) {
      setActiveSubmenu(null);
      setSubmenuTitle(null);
      setSubmenuStack([]);
      return;
    }

    const newStack = [...submenuStack];
    newStack.pop();
    const previousSubmenu = newStack[newStack.length - 1];

    if (!previousSubmenu) {
      setActiveSubmenu(null);
      setSubmenuTitle(null);
      setSubmenuStack([]);
      return;
    }

    setActiveSubmenu(previousSubmenu.id);
    setSubmenuTitle(previousSubmenu.title);
    setSubmenuStack(newStack);
  }, [submenuStack]);

  const registerSubmenuContent = React.useCallback((id: string, content: ReadonlyArray<React.ReactNode>): void => {
    submenuContentRef.current.set(id, content);
  }, []);

  const extractSubmenuContent = React.useCallback((elements: React.ReactNode, targetId: string): ReadonlyArray<React.ReactNode> => {
    const result: Array<React.ReactNode> = [];

    const findSubmenuContent = (node: React.ReactNode): void => {
      if (!React.isValidElement(node)) {
        return;
      }

      const element = node as React.ReactElement<{
        "data-submenu-id"?: string;
        children?: React.ReactNode;
        id?: string;
      }>;

      if (element.type === DropDrawerSub) {
        const elementId = element.props.id;
        const dataSubmenuId = element.props["data-submenu-id"];

        if (elementId === targetId || dataSubmenuId === targetId) {
          if (element.props.children) {
            React.Children.forEach(element.props.children, (child) => {
              if (React.isValidElement(child) && child.type === DropDrawerSubContent) {
                const subContentElement = child as React.ReactElement<{children?: React.ReactNode}>;

                React.Children.forEach(subContentElement.props.children, (contentChild) => {
                  result.push(contentChild);
                });
              }
            });
          }

          return;
        }
      }

      if (element.props.children) {
        React.Children.forEach(element.props.children, findSubmenuContent);
      }
    };

    React.Children.forEach(elements, findSubmenuContent);
    return result;
  }, []);

  const getSubmenuContent = React.useCallback(
    (id: string): ReadonlyArray<React.ReactNode> => {
      const cachedContent = submenuContentRef.current.get(id);

      if (cachedContent && cachedContent.length > 0) {
        return cachedContent;
      }

      const submenuContent = extractSubmenuContent(children, id);

      if (submenuContent.length > 0) {
        submenuContentRef.current.set(id, submenuContent);
      }

      return submenuContent;
    },
    [children, extractSubmenuContent],
  );

  const variants = {
    center: {
      opacity: 1,
      x: 0,
    },
    enter: (direction: "forward" | "backward") => ({
      opacity: 0,
      x: direction === "forward" ? "100%" : "-100%",
    }),
    exit: (direction: "forward" | "backward") => ({
      opacity: 0,
      x: direction === "forward" ? "-100%" : "100%",
    }),
  };

  const transition = {
    duration: 0.3,
    ease: [0.25, 0.1, 0.25, 1],
  } satisfies Transition;

  if (isMobile) {
    return (
      <SubmenuContext.Provider
        value={{
          activeSubmenu,
          navigateToSubmenu,
          registerSubmenuContent,
          setActiveSubmenu: (id) => {
            if (id === null) {
              setActiveSubmenu(null);
              setSubmenuTitle(null);
              setSubmenuStack([]);
            }
          },
          setSubmenuTitle,
          submenuTitle,
        }}>
        <DrawerContent
          data-slot='drop-drawer-content'
          className={cn(styles.mobileContent, className)}
          {...(props as React.ComponentProps<typeof DrawerContent>)}>
          {activeSubmenu ? (
            <>
              <DrawerHeader>
                <div className={styles.mobileHeaderRow}>
                  <button
                    type='button'
                    aria-label={MOBILE_BACK_LABEL}
                    onClick={goBack}
                    className={styles.backButton}>
                    <ChevronLeftIcon className={styles.chevron} />
                  </button>
                  <DrawerTitle>{submenuTitle || MOBILE_SUBMENU_TITLE}</DrawerTitle>
                </div>
              </DrawerHeader>
              <div className={styles.mobileViewport}>
                <AnimatePresence
                  initial={false}
                  mode='wait'
                  custom={animationDirection}>
                  <motion.div
                    key={activeSubmenu}
                    custom={animationDirection}
                    variants={variants}
                    initial='enter'
                    animate='center'
                    exit='exit'
                    transition={transition}
                    className={styles.mobileMotionPanel}>
                    {getSubmenuContent(activeSubmenu)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <DrawerHeader className={styles.screenReaderOnlyHeader}>
                <DrawerTitle>{MOBILE_MENU_TITLE}</DrawerTitle>
              </DrawerHeader>
              <div className={styles.mobileMainViewport}>
                <AnimatePresence
                  initial={false}
                  mode='wait'
                  custom={animationDirection}>
                  <motion.div
                    key='main-menu'
                    custom={animationDirection}
                    variants={variants}
                    initial='enter'
                    animate='center'
                    exit='exit'
                    transition={transition}
                    className={styles.mobileMotionPanel}>
                    {children}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}
        </DrawerContent>
      </SubmenuContext.Provider>
    );
  }

  return (
    <SubmenuContext.Provider
      value={{
        activeSubmenu,
        registerSubmenuContent,
        setActiveSubmenu,
        setSubmenuTitle,
        submenuTitle,
      }}>
      <DropdownMenuContent
        data-slot='drop-drawer-content'
        align='end'
        sideOffset={4}
        className={cn(styles.desktopContent, className)}
        {...(props as React.ComponentProps<typeof DropdownMenuContent>)}>
        {children}
      </DropdownMenuContent>
    </SubmenuContext.Provider>
  );
}

function DropDrawerItem({
  className,
  children,
  closeOnClick,
  disabled,
  icon,
  inset,
  onClick,
  onSelect,
  ...props
}: SharedDropDrawerItemProps): React.JSX.Element {
  const {isMobile} = useDropDrawerContext();

  const isInGroup = React.useCallback((element: HTMLElement | null): boolean => {
    if (!element) {
      return false;
    }

    let parent = element.parentElement;

    while (parent) {
      if (parent.hasAttribute("data-drop-drawer-group")) {
        return true;
      }

      parent = parent.parentElement;
    }

    return false;
  }, []);

  const itemRef = React.useRef<HTMLDivElement>(null);
  const [isInsideGroup, setIsInsideGroup] = React.useState(false);

  React.useEffect(() => {
    if (!isMobile) {
      return;
    }

    const timer = globalThis.window.setTimeout(() => {
      if (itemRef.current) {
        setIsInsideGroup(isInGroup(itemRef.current));
      }
    }, 0);

    return () => globalThis.window.clearTimeout(timer);
  }, [isInGroup, isMobile]);

  const handleSelect = React.useCallback(
    (event: Event): void => {
      if (!disabled) {
        onSelect?.(event);
      }
    },
    [disabled, onSelect],
  );

  if (isMobile) {
    const handleClick: React.MouseEventHandler<HTMLDivElement> = (event): void => {
      if (disabled) {
        return;
      }

      onClick?.(event);
      handleSelect(event.nativeEvent);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event): void => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      event.currentTarget.click();
    };

    const content = (
      <div
        ref={itemRef}
        data-slot='drop-drawer-item'
        data-disabled={disabled}
        data-inset={inset}
        role='menuitem'
        tabIndex={disabled ? -1 : 0}
        className={cn(
          styles.mobileItem,
          !isInsideGroup && styles.mobileStandaloneItem,
          isInsideGroup && styles.mobileGroupedItem,
          inset && styles.inset,
          disabled && styles.disabled,
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-disabled={disabled}
        {...props}>
        <div className={styles.itemChildren}>{children}</div>
        {icon ? <div className={styles.itemIcon}>{icon}</div> : null}
      </div>
    );

    const parentSubmenuId = props["data-parent-submenu-id"] ?? props["data-parent-submenu"];

    if (parentSubmenuId) {
      return content;
    }

    return (
      <BaseDrawer.Close
        nativeButton={false}
        render={content}
      />
    );
  }

  const handleDesktopClick: React.MouseEventHandler<HTMLElement> = (event): void => {
    if (disabled) {
      return;
    }

    onClick?.(event);
    handleSelect(event.nativeEvent);
  };

  return (
    <DropdownMenuItem
      data-slot='drop-drawer-item'
      data-inset={inset}
      className={cn(styles.desktopItem, className)}
      closeOnClick={closeOnClick}
      disabled={disabled}
      inset={inset}
      onClick={handleDesktopClick}
      {...props}>
      <div className={styles.itemRow}>
        <div className={styles.itemChildren}>{children}</div>
        {icon ? <div className={styles.itemIcon}>{icon}</div> : null}
      </div>
    </DropdownMenuItem>
  );
}

function DropDrawerSeparator({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuSeparator>): React.JSX.Element | null {
  const {isMobile} = useDropDrawerContext();

  if (isMobile) {
    return null;
  }

  return (
    <DropdownMenuSeparator
      data-slot='drop-drawer-separator'
      className={className}
      {...props}
    />
  );
}

function DropDrawerLabel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuLabel> | React.ComponentProps<typeof DrawerTitle>): React.JSX.Element {
  const {isMobile} = useDropDrawerContext();

  return isMobile ? (
    <DrawerHeader className={styles.mobileLabelWrapper}>
      <DrawerTitle
        data-slot='drop-drawer-label'
        className={cn(styles.mobileLabel, className)}
        {...(props as React.ComponentProps<typeof DrawerTitle>)}>
        {children}
      </DrawerTitle>
    </DrawerHeader>
  ) : (
    <DropdownMenuLabel
      data-slot='drop-drawer-label'
      className={className}
      {...(props as React.ComponentProps<typeof DropdownMenuLabel>)}>
      {children}
    </DropdownMenuLabel>
  );
}

function DropDrawerFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerFooter> | React.ComponentProps<"div">): React.JSX.Element {
  const {isMobile} = useDropDrawerContext();

  return isMobile ? (
    <DrawerFooter
      data-slot='drop-drawer-footer'
      className={cn(styles.mobileFooter, className)}
      {...(props as React.ComponentProps<typeof DrawerFooter>)}>
      {children}
    </DrawerFooter>
  ) : (
    <div
      data-slot='drop-drawer-footer'
      className={cn(styles.desktopFooter, className)}
      {...props}>
      {children}
    </div>
  );
}

function DropDrawerGroup({className, children, ...props}: React.ComponentProps<"div"> & {children: React.ReactNode}): React.JSX.Element {
  const {isMobile} = useDropDrawerContext();

  const childrenWithSeparators = React.useMemo(() => {
    if (!isMobile) {
      return children;
    }

    const childArray = React.Children.toArray(children);
    const filteredChildren = childArray.filter((child) => !(React.isValidElement(child) && child.type === DropDrawerSeparator));

    return filteredChildren.flatMap((child, index) => {
      if (index === filteredChildren.length - 1) {
        return [child];
      }

      return [
        child,
        <div
          key={`separator-${index}`}
          className={styles.mobileGroupSeparator}
          aria-hidden='true'
        />,
      ];
    });
  }, [children, isMobile]);

  return isMobile ? (
    <div
      data-drop-drawer-group
      data-slot='drop-drawer-group'
      role='group'
      className={cn(styles.mobileGroup, className)}
      {...props}>
      {childrenWithSeparators}
    </div>
  ) : (
    <BaseMenu.Group
      data-drop-drawer-group
      data-slot='drop-drawer-group'
      className={className}
      {...(props as React.ComponentPropsWithoutRef<typeof BaseMenu.Group>)}>
      {children}
    </BaseMenu.Group>
  );
}

function DropDrawerSub({
  children,
  id,
  ...props
}: React.ComponentPropsWithoutRef<typeof DropdownMenuSub> & {children?: React.ReactNode; id?: string}): React.JSX.Element {
  const {isMobile} = useDropDrawerContext();
  const {registerSubmenuContent} = React.useContext(SubmenuContext);
  const generatedId = React.useId();
  const submenuId = id || generatedId;

  React.useEffect(() => {
    if (!registerSubmenuContent) {
      return;
    }

    const contentItems: Array<React.ReactNode> = [];

    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.type === DropDrawerSubContent) {
        const childElement = child as React.ReactElement<{children?: React.ReactNode}>;

        React.Children.forEach(childElement.props.children, (contentChild) => {
          contentItems.push(contentChild);
        });
      }
    });

    if (contentItems.length > 0) {
      registerSubmenuContent(submenuId, contentItems);
    }
  }, [children, registerSubmenuContent, submenuId]);

  if (isMobile) {
    const processedChildren = React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) {
        return child;
      }

      if (child.type === DropDrawerSubTrigger || child.type === DropDrawerSubContent) {
        return React.cloneElement(child as React.ReactElement<MobileSubmenuDataAttributes>, {
          "data-parent-submenu": submenuId,
          "data-parent-submenu-id": submenuId,
          "data-submenu-id": submenuId,
        });
      }

      return child;
    });

    return (
      <div
        data-slot='drop-drawer-sub'
        data-submenu-id={submenuId}
        id={submenuId}>
        {processedChildren}
      </div>
    );
  }

  return (
    <DropdownMenuSub
      data-slot='drop-drawer-sub'
      data-submenu-id={submenuId}
      {...props}>
      {children}
    </DropdownMenuSub>
  );
}

interface DropDrawerSubTriggerProps
  extends Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuSubTrigger>, "children" | "onClick">, MobileSubmenuDataAttributes {
  children?: React.ReactNode;
  className?: string;
  inset?: boolean;
  onClick?: React.MouseEventHandler<HTMLElement>;
}

function DropDrawerSubTrigger({className, inset, children, onClick, ...props}: DropDrawerSubTriggerProps): React.JSX.Element {
  const {isMobile} = useDropDrawerContext();
  const {navigateToSubmenu} = React.useContext(SubmenuContext);

  const isInGroup = React.useCallback((element: HTMLElement | null): boolean => {
    if (!element) {
      return false;
    }

    let parent = element.parentElement;

    while (parent) {
      if (parent.hasAttribute("data-drop-drawer-group")) {
        return true;
      }

      parent = parent.parentElement;
    }

    return false;
  }, []);

  const itemRef = React.useRef<HTMLDivElement>(null);
  const [isInsideGroup, setIsInsideGroup] = React.useState(false);

  React.useEffect(() => {
    if (!isMobile) {
      return;
    }

    const timer = globalThis.window.setTimeout(() => {
      if (itemRef.current) {
        setIsInsideGroup(isInGroup(itemRef.current));
      }
    }, 0);

    return () => globalThis.window.clearTimeout(timer);
  }, [isInGroup, isMobile]);

  if (isMobile) {
    const navigate = (eventTarget: HTMLElement): void => {
      let submenuId: string | null = null;
      const closestElement = eventTarget.closest("[data-submenu-id]");
      const closestId = closestElement?.getAttribute("data-submenu-id");

      if (closestId) {
        submenuId = closestId;
      }

      if (!submenuId) {
        submenuId = props["data-parent-submenu-id"] ?? props["data-parent-submenu"] ?? null;
      }

      if (!submenuId) {
        return;
      }

      const title = typeof children === "string" ? children : MOBILE_SUBMENU_TITLE;
      navigateToSubmenu?.(submenuId, title);
    };

    const handleClick: React.MouseEventHandler<HTMLDivElement> = (event): void => {
      event.preventDefault();
      event.stopPropagation();
      onClick?.(event);
      navigate(event.currentTarget);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event): void => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.click();
    };

    return (
      <div
        ref={itemRef}
        data-slot='drop-drawer-sub-trigger'
        data-inset={inset}
        role='menuitem'
        tabIndex={0}
        className={cn(
          styles.mobileItem,
          !isInsideGroup && styles.mobileStandaloneItem,
          isInsideGroup && styles.mobileGroupedItem,
          inset && styles.inset,
          className,
        )}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}>
        <div className={styles.itemChildren}>{children}</div>
        <ChevronRightIcon className={styles.chevron} />
      </div>
    );
  }

  return (
    <DropdownMenuSubTrigger
      data-slot='drop-drawer-sub-trigger'
      data-inset={inset}
      className={className}
      inset={inset}
      onClick={onClick}
      {...props}>
      {children}
    </DropdownMenuSubTrigger>
  );
}

function DropDrawerSubContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuSubContent>): React.JSX.Element | null {
  const {isMobile} = useDropDrawerContext();

  if (isMobile) {
    return null;
  }

  return (
    <DropdownMenuSubContent
      data-slot='drop-drawer-sub-content'
      sideOffset={sideOffset}
      className={cn(styles.dropdownSubContent, className)}
      {...props}>
      {children}
    </DropdownMenuSubContent>
  );
}

export {
  DropDrawer,
  DropDrawerContent,
  DropDrawerFooter,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerLabel,
  DropDrawerSeparator,
  DropDrawerSub,
  DropDrawerSubContent,
  DropDrawerSubTrigger,
  DropDrawerTrigger,
};
