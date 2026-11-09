"use client";

import {useDirection} from "@base-ui/react/direction-provider";
import type {Drawer as BaseDrawer} from "@base-ui/react/drawer";
import {useRender} from "@base-ui/react/use-render";
import {ChevronLeft} from "lucide-react";
import * as React from "react";
import {createPortal} from "react-dom";

import {useMergedRefs} from "@/hooks/useMergedRefs";
import {useMobilePanelFocusRecovery} from "@/lib/_focus-availability";
import {cn} from "@/lib/utilities";
import {
  contentOf,
  elementOf,
  getLivePath,
  NavigationContext,
  requestSubmenuChange,
  useNavigation,
  usePanelTitles,
  usePathFocusIntent,
  useRoot,
  useSubmenu,
  withChildren,
  type SubmenuRegistration,
} from "./_dropdrawer";
import {DrawerContent, DrawerTitle} from "./drawer";
import type {DropDrawerContentProps, DropDrawerPanelState, DropDrawerSubContentProps} from "./dropdrawer";
import styles from "./dropdrawer.module.css";

/** A closed Drawer portal must not resolve the mobile popup's pending element children. */
function MobileElementChildren({
  children,
  render,
}: Readonly<{children: React.ReactNode; render: BaseDrawer.Popup.Props["render"]}>): React.ReactElement {
  return <>{contentOf(children, render)}</>;
}

/** Live mobile navigation: register actual nodes, never copied/cached React children. */
export const MobileContent = ({
  ref,
  children,
  className,
  render,
  drawerProps,
  initialFocus,
  finalFocus,
  ...props
}: Readonly<DropDrawerContentProps>): React.JSX.Element => {
  const root = useRoot();
  // Base UI's useDirection() reports "ltr" both without a DirectionProvider and for an explicit LTR one, so only "rtl" is
  // written: an "ltr" default would contradict a document-level dir="rtl" that the portaled drawer otherwise inherits.
  const direction = useDirection();
  const providerDir = direction === "rtl" ? "rtl" : undefined;
  const popupRender = drawerProps?.render ?? render;
  const {className: drawerClassName, ...drawerPopupProps} = drawerProps ?? {};
  const [path, setPath] = React.useState<readonly string[]>([]);
  const [previousOpen, setPreviousOpen] = React.useState(root.open);
  // Reset navigation on the state transition without remounting the SDK popup or delaying reset until an effect.
  if (previousOpen !== root.open) {
    setPreviousOpen(root.open);
    if (!root.open) setPath([]);
  }
  const [panelHost, setPanelHost] = React.useState<HTMLDivElement | null>(null);
  const [panelTitles, setPanelTitle] = usePanelTitles();
  const mainRef = React.useRef<HTMLDivElement>(null);
  const entriesRef = React.useRef(new Map<string, SubmenuRegistration>());
  const openingRequestsRef = React.useRef(new Set<string>());
  const pendingFocusRef = React.useRef<"entry" | HTMLElement | null>(null);
  usePathFocusIntent(root.open, path, entriesRef, pendingFocusRef);
  const activeId = useMobilePanelFocusRecovery(root.open, path, mainRef, entriesRef, pendingFocusRef);
  const activeTitle = activeId === null ? undefined : panelTitles.get(activeId);
  const closePath = React.useCallback((id: string): void => {
    setPath((previous) => {
      const index = previous.indexOf(id);
      return index === -1 ? previous : previous.slice(0, index);
    });
  }, []);
  const activateRequestedPath = React.useCallback((): void => {
    if (!root.open) return;
    let candidate: readonly string[] = [];
    for (const requestedId of openingRequestsRef.current) {
      const livePath = getLivePath(requestedId, entriesRef.current);
      if (livePath && livePath.length >= candidate.length) candidate = livePath;
    }
    if (candidate.length === 0) return;
    setPath((previous) =>
      previous.length === candidate.length && previous.every((value, index) => value === candidate[index]) ? previous : candidate,
    );
  }, [root.open]);
  const synchronize = React.useCallback(
    (id: string, nextOpen: boolean): void => {
      if (!nextOpen) {
        openingRequestsRef.current.delete(id);
        for (const requestedId of openingRequestsRef.current) {
          let ancestorId = entriesRef.current.get(requestedId)?.parentId;
          while (ancestorId !== null && ancestorId !== undefined) {
            if (ancestorId === id) {
              openingRequestsRef.current.delete(requestedId);
              break;
            }
            ancestorId = entriesRef.current.get(ancestorId)?.parentId;
          }
        }
        closePath(id);
        return;
      }
      openingRequestsRef.current.delete(id);
      openingRequestsRef.current.add(id);
      activateRequestedPath();
    },
    [activateRequestedPath, closePath],
  );
  const panelAvailabilityChanged = React.useCallback(
    (id: string): void => {
      if (!entriesRef.current.get(id)?.panelRef.current?.isConnected) closePath(id);
      activateRequestedPath();
    },
    [activateRequestedPath, closePath],
  );
  const register = React.useCallback(
    (entry: SubmenuRegistration): (() => void) => {
      const registered = entriesRef.current.get(entry.id);
      if (registered && registered !== entry) throw new Error(`Duplicate DropDrawerSub id: ${entry.id}`);
      entriesRef.current.set(entry.id, entry);
      activateRequestedPath();
      return () => {
        if (entriesRef.current.get(entry.id) !== entry) return;
        closePath(entry.id);
        entriesRef.current.delete(entry.id);
        openingRequestsRef.current.delete(entry.id);
      };
    },
    [activateRequestedPath, closePath],
  );
  React.useLayoutEffect(() => {
    if (!root.open) openingRequestsRef.current.clear();
  }, [root.open]);
  const navigate = React.useCallback(
    (id: string, event: MouseEvent): void => {
      const entry = entriesRef.current.get(id);
      if (!entry?.panelRef.current?.isConnected || entry.optionsRef.current.disabled || !requestSubmenuChange(entry, true, event)) return;
      synchronize(id, true);
    },
    [synchronize],
  );
  const goBack = (event: React.MouseEvent<HTMLButtonElement>): void => {
    const active = activeId === null ? undefined : entriesRef.current.get(activeId);
    if (!active || !requestSubmenuChange(active, false, event.nativeEvent)) return;
    synchronize(active.id, false);
  };
  const navigation = React.useMemo(
    () => ({activeId, path, panelHost, register, navigate, synchronize, panelAvailabilityChanged, setPanelTitle}),
    [activeId, path, panelHost, register, navigate, synchronize, panelAvailabilityChanged, setPanelTitle],
  );
  const {
    align,
    alignOffset,
    side,
    sideOffset,
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
    ...popupProps
  } = props;

  return (
    <NavigationContext.Provider value={navigation}>
      <DrawerContent
        data-slot='drop-drawer-content'
        ref={ref}
        dir={providerDir}
        initialFocus={drawerProps?.initialFocus ?? initialFocus}
        finalFocus={drawerProps?.finalFocus ?? finalFocus}
        render={popupRender}
        className={(state) =>
          cn(
            styles.mobileContent,
            typeof className === "function" ? className(state) : className,
            typeof drawerClassName === "function" ? drawerClassName(state) : drawerClassName,
          )
        }
        {...popupProps}
        {...drawerPopupProps}>
        <div className={cn(styles.mobileHeader, activeId === null && styles.screenReaderOnlyHeader)}>
          {activeId !== null && (
            <button
              type='button'
              aria-label={root.backLabel}
              className={styles.backButton}
              onClick={goBack}>
              <ChevronLeft
                aria-hidden='true'
                data-direction={direction}
                className={styles.chevron}
              />
            </button>
          )}
          <DrawerTitle>{activeTitle || root.mobileTitle}</DrawerTitle>
        </div>
        <div
          ref={mainRef}
          hidden={activeId !== null}
          tabIndex={-1}
          className={styles.mobilePanel}>
          <MobileElementChildren render={popupRender}>{children}</MobileElementChildren>
        </div>
        <div
          ref={setPanelHost}
          className={styles.mobilePanelHost}
        />
      </DrawerContent>
    </NavigationContext.Provider>
  );
};
MobileContent.displayName = "DropDrawerMobileContent";

/** Keeps mobile panel descendants mounted in a portal, so registration and child updates remain live. */
export const MobileSubContent = ({
  ref,
  children,
  className,
  render,
  id,
  ...props
}: Readonly<DropDrawerSubContentProps>): React.ReactElement | null => {
  const entry = useSubmenu();
  const navigation = useNavigation();
  const {panelAvailabilityChanged} = navigation;
  const notifyPanelRef = React.useCallback(() => panelAvailabilityChanged(entry.id), [entry.id, panelAvailabilityChanged]);
  const mergedRef = useMergedRefs(ref, entry.panelRef, notifyPanelRef);
  const open = navigation.activeId === entry.id;
  const renderElement = elementOf(render);
  const panelId = renderElement?.props.id ?? id ?? `${entry.id}-panel`;
  const {setPanelId} = entry;
  React.useLayoutEffect(() => {
    setPanelId(panelId);
  }, [panelId, setPanelId]);
  const {
    align,
    alignOffset,
    side,
    sideOffset,
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
    finalFocus,
    style,
    ...panelProps
  } = props;
  const panel = useRender<DropDrawerPanelState, HTMLElement>({
    defaultTagName: "div",
    ref: mergedRef,
    render: withChildren(render, contentOf(children, render)),
    state: {open},
    props: {
      "data-slot": "drop-drawer-sub-content",
      id: panelId,
      hidden: !open,
      tabIndex: -1,
      className: cn(styles.mobilePanel, typeof className === "function" ? className({open}) : className),
      style: typeof style === "function" ? style({open}) : style,
      children: contentOf(children, render),
      ...panelProps,
    },
  });
  return navigation.panelHost ? createPortal(panel, navigation.panelHost) : null;
};
MobileSubContent.displayName = "DropDrawerMobileSubContent";
