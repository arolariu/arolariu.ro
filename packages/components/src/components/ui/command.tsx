"use client";

import {Separator as BaseSeparator} from "@base-ui/react/separator";
import {Search} from "lucide-react";
import * as React from "react";

import {useMergedRefs} from "@/hooks/useMergedRefs";
import {cn} from "@/lib/utilities";
import {
  isAnchorInOrder,
  measureRenderedOrder,
  orderRegisteredNodes,
  restoreRegisteredFocus,
  sameRanks,
  type RankedNode,
} from "./_command-order";
import {Dialog, DialogContent, DialogDescription, DialogTitle, type DialogProps} from "./dialog";
import {InputGroup, InputGroupAddon} from "./input-group";
import styles from "./command.module.css";

/** Positive scores match and sort descending; keywords are a per-call mutable snapshot. */
export type CommandFilter = (value: string, search: string, keywords?: string[]) => number;

/** Native command registry options. Selected value is distinct from input search. */
export type CommandProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    /** Accessible command/list label. @default "Commands" */
    label?: string;
    /** Apply the local substring or supplied scoring filter. @default true */
    shouldFilter?: boolean;
    /** Custom item scoring; no cmdk fuzzy-ranking algorithm is implied. */
    filter?: CommandFilter;
    /** Initial selected item value (not initial search). */
    defaultValue?: string;
    /** Committed selected item value; rejected proposals never change selection. */
    value?: string;
    /** Selection proposal from pointer, focus or keyboard interaction. */
    onValueChange?: (value: string) => void;
    /** Wrap arrow navigation at the endpoints. @default false */
    loop?: boolean;
    /** Prevent hover from selecting items. @default false */
    disablePointerSelection?: boolean;
    /** Enable Ctrl+n/j and Ctrl+p/k navigation. @default true */
    vimBindings?: boolean;
  }
>;

/** Modal shell only: callers provide exactly one explicit Command root. */
export type CommandDialogProps = Readonly<
  Omit<DialogProps, "children"> & {
    ref?: React.Ref<HTMLDivElement>;
    children?: React.ReactNode;
    /** Real accessible dialog title. @default "Command menu" */
    title?: React.ReactNode;
    /** Real accessible description. @default "Search for a command to run..." */
    description?: React.ReactNode;
    /** Popup classes. */
    className?: string;
    /** Append the shared Dialog close control. @default false */
    showCloseButton?: boolean;
    /** Caller-localizable name for the optional dismissal control. @default "Close" */
    closeLabel?: string;
  }
>;

/** Native input props, including name/form/disabled and the committed search value. */
export type CommandInputProps = Readonly<
  Omit<React.ComponentPropsWithRef<"input">, "type" | "value" | "defaultValue"> & {
    /** Committed controlled search. */
    value?: string;
    /** Initial uncontrolled search. @default "" */
    defaultValue?: string;
    /** Search proposal, after a non-cancelled native onChange. */
    onValueChange?: (search: string) => void;
  }
>;

/** Native listbox props. Its effective id is linked to the combobox. */
export type CommandListProps = Readonly<React.ComponentPropsWithRef<"div"> & {label?: string}>;
/** Native live status props; mounted only while there are no visible options. */
export type CommandEmptyProps = Readonly<React.ComponentPropsWithRef<"div">>;
/** Registered, labelled group. Hidden descendants stay mounted and searchable. */
export type CommandGroupProps = Readonly<
  React.ComponentPropsWithRef<"div"> & {
    heading?: React.ReactNode;
    /** Optional group metadata; identity is the group's stable DOM id. */
    value?: string;
    /** Keep this group and its items visible regardless of filtering. @default false */
    forceMount?: boolean;
  }
>;
/** Primitive-owned separator composition, state, orientation and refs. */
export type CommandSeparatorProps = Readonly<
  React.ComponentPropsWithRef<typeof BaseSeparator> & {
    /** Keep separators visible during filtering. @default false */
    alwaysRender?: boolean;
  }
>;
/** Native option props with cancellable consumer events and filtering metadata. */
export type CommandItemProps = Readonly<
  Omit<React.ComponentPropsWithRef<"div">, "onSelect"> & {
    /** Skip this option for navigation and activation. @default false */
    disabled?: boolean;
    /** Activation callback (distinct from the root's selected-value proposal). */
    onSelect?: (value: string) => void;
    /** Filtering/selection value; defaults to trimmed rendered text. */
    value?: string;
    /** Additional substring/custom-filter search terms. @default [] */
    keywords?: readonly string[];
    /** Keep visible irrespective of scores; inherited from the group. @default false */
    forceMount?: boolean;
  }
>;
/** Native shortcut text props with a forwarded span ref. */
export type CommandShortcutProps = Readonly<React.ComponentPropsWithRef<"span">>;

interface RegisteredItem {
  readonly disabled: boolean;
  readonly forceMount: boolean;
  readonly hidden: boolean;
  readonly groupId: string | null;
  readonly id: string;
  readonly keywords: readonly string[];
  readonly ref: React.RefObject<HTMLDivElement | null>;
  readonly value: string;
}

interface RegisteredGroup {
  readonly id: string;
  readonly parentId: string | null;
  readonly ref: React.RefObject<HTMLDivElement | null>;
}

interface Registry {
  readonly items: ReadonlyMap<string, RegisteredItem>;
  readonly groups: ReadonlyMap<string, RegisteredGroup>;
  readonly revision: number;
}

interface CommandContextValue {
  readonly activeItemId: string | null;
  readonly disablePointerSelection: boolean;
  readonly isFiltering: boolean;
  readonly isItemVisible: (itemId: string) => boolean;
  readonly isRestoringFocus: (element: HTMLElement) => boolean;
  readonly hasVisibleItemsInGroup: (groupId: string) => boolean;
  readonly label: string;
  readonly listId: string;
  readonly listRef: React.RefObject<HTMLDivElement | null>;
  readonly observeOrder: (list: HTMLElement) => () => void;
  readonly registerItem: (item: RegisteredItem) => void;
  readonly unregisterItem: (id: string) => void;
  readonly registerGroup: (group: RegisteredGroup) => void;
  readonly unregisterGroup: (id: string) => void;
  readonly search: string;
  readonly setSearch: (search: string) => void;
  readonly setListId: (id: string) => void;
  readonly selectItem: (id: string) => void;
  readonly verifyOrder: (anchor: Element | null) => void;
  readonly visibleItemCount: number;
}

const CommandContext = React.createContext<CommandContextValue | null>(null);
const CommandGroupContext = React.createContext<Readonly<{id: string; forceMount: boolean; hidden: boolean}> | null>(null);

function useCommandContext(componentName: string): CommandContextValue {
  const context = React.useContext(CommandContext);
  if (!context) throw new Error(`${componentName} must be used within Command.`);
  return context;
}

function defaultCommandFilter(value: string, search: string, keywords: readonly string[] = []): number {
  const haystack = [value, ...keywords].join(" ").trim().toLowerCase();
  return haystack.includes(search.trim().toLowerCase()) ? 1 : 0;
}

interface NavigationFocusRequest {
  readonly origin: HTMLElement;
  readonly originId: string;
  readonly targetId: string;
}

type NavigationRequest =
  | Readonly<{kind: "step"; direction: 1 | -1; group: boolean}>
  | Readonly<{kind: "endpoint"; direction: 1 | -1}>
  | Readonly<{kind: "activate"}>;

function vimNavigationRequest(key: string): NavigationRequest | null {
  if (key === "n" || key === "j") return {kind: "step", direction: 1, group: false};
  if (key === "p" || key === "k") return {kind: "step", direction: -1, group: false};
  return null;
}

function navigationRequest(event: React.KeyboardEvent<HTMLDivElement>, vimBindings: boolean): NavigationRequest | null {
  if (event.nativeEvent.isComposing || event.shiftKey) return null;
  if (event.ctrlKey) {
    if (!vimBindings || event.altKey || event.metaKey) return null;
    return vimNavigationRequest(event.key);
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    const direction = event.key === "ArrowDown" ? 1 : -1;
    return event.metaKey ? {kind: "endpoint", direction} : {kind: "step", direction, group: event.altKey};
  }
  if (event.altKey || event.metaKey) return null;
  if (event.key === "Home") return {kind: "endpoint", direction: -1};
  if (event.key === "End") return {kind: "endpoint", direction: 1};
  return event.key === "Enter" ? {kind: "activate"} : null;
}

function nextGroupIndex(items: readonly RegisteredItem[], index: number, direction: 1 | -1): number {
  const current = items[index];
  if (!current) return 0;
  const groupKey = (item: RegisteredItem): string => item.groupId ?? item.id;
  const candidates = direction > 0 ? items.slice(index + 1) : items.slice(0, index).toReversed();
  const target = candidates.find((item) => groupKey(item) !== groupKey(current));
  return target ? items.findIndex((item) => groupKey(item) === groupKey(target)) : direction > 0 ? items.length : -1;
}

function nextItem(
  items: readonly RegisteredItem[],
  activeId: string | null,
  request: Extract<NavigationRequest, {kind: "step"}>,
  loop: boolean,
): RegisteredItem | undefined {
  const index = items.findIndex((item) => item.id === activeId);
  const next = request.group ? nextGroupIndex(items, index, request.direction) : index === -1 ? 0 : index + request.direction;
  if (next >= 0 && next < items.length) return items[next];
  return loop ? (request.direction > 0 ? items[0] : items.at(-1)) : undefined;
}

function isNestedControl(target: EventTarget): boolean {
  if (!(target instanceof Element)) return false;
  const control = target.closest("button, a, input, textarea, select");
  return control !== null && control.getAttribute("data-slot") !== "command-input";
}

/**
 * Native, context-scoped command controller; not a cmdk package emulation.
 * Filtering retains registrations, score order, rendered-order ties and committed control; unfiltered DOM and keyboard
 * order always follow the consumer's rendered order inside CommandList, including keyed reorders by memoized rows that
 * re-render no Command part (a list MutationObserver re-reads them) and late mounts.
 * Home/End, arrows, Meta endpoints, Alt groups and optional Ctrl Vim keys navigate.
 * Option-origin navigation transfers focus only after selection commits; input focus stays put.
 * Place registered groups/items directly beneath CommandList/CommandGroup for score ordering.
 */
const Command = ({
  ref,
  children,
  className,
  defaultValue = "",
  disablePointerSelection = false,
  filter = defaultCommandFilter,
  label = "Commands",
  loop = false,
  onKeyDown,
  onValueChange,
  shouldFilter = true,
  value,
  vimBindings = true,
  ...props
}: Readonly<CommandProps>): React.JSX.Element => {
  const [selection, setSelection] = React.useState(defaultValue);
  const [search, setSearch] = React.useState("");
  const generatedListId = React.useId();
  const [listId, setListId] = React.useState(generatedListId);
  const navigationFocusRequestRef = React.useRef<NavigationFocusRequest | null>(null);
  const restoringFocusRef = React.useRef<HTMLElement | null>(null);
  const isRestoringFocus = React.useCallback((element: HTMLElement): boolean => {
    const restoring = restoringFocusRef.current;
    return restoring !== null && element.contains(restoring);
  }, []);
  const [registry, setRegistry] = React.useState<Registry>(() => ({items: new Map(), groups: new Map(), revision: 0}));
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const observerRef = React.useRef<MutationObserver | null>(null);
  const reconcileRef = React.useRef<() => void>(() => undefined);
  const naturalRef = React.useRef<ReadonlyMap<string, number>>(new Map());
  // Sibling-relative rendered rank of each anchored id, measured after commit; placement moves never change it.
  const [natural, setNatural] = React.useState<ReadonlyMap<string, number>>(() => new Map());
  const measureOrder = React.useCallback((): void => {
    const ranks = listRef.current ? measureRenderedOrder(listRef.current) : new Map<string, number>();
    if (sameRanks(ranks, naturalRef.current)) return;
    naturalRef.current = ranks;
    setNatural(ranks);
  }, []);
  // O(1) local check per committed anchor; only an out-of-order or unmeasured anchor pays for a full measure.
  const verifyOrder = React.useCallback(
    (anchor: Element | null): void => {
      if (anchor && listRef.current?.contains(anchor) && !isAnchorInOrder(anchor, naturalRef.current)) measureOrder();
    },
    [measureOrder],
  );
  // Commits that move memoized rows re-render no Command part; the list's observer still re-reads their order.
  const observeOrder = React.useCallback((list: HTMLElement): (() => void) => {
    const observer = new MutationObserver(() => {
      reconcileRef.current();
    });
    observer.observe(list, {childList: true, subtree: true});
    observerRef.current = observer;
    return () => {
      observer.disconnect();
      if (observerRef.current === observer) observerRef.current = null;
    };
  }, []);

  const registerItem = React.useCallback((item: RegisteredItem): void => {
    setRegistry((current) => {
      const existing = current.items.get(item.id);
      if (
        existing
        && existing.disabled === item.disabled
        && existing.forceMount === item.forceMount
        && existing.hidden === item.hidden
        && existing.groupId === item.groupId
        && existing.ref === item.ref
        && existing.value === item.value
        && existing.keywords.length === item.keywords.length
        && existing.keywords.every((keyword, index) => keyword === item.keywords[index])
      )
        return current;
      const items = new Map(current.items);
      items.set(item.id, {...item, keywords: [...item.keywords]});
      return {...current, items, revision: current.revision + 1};
    });
  }, []);
  const unregisterItem = React.useCallback((id: string): void => {
    setRegistry((current) => {
      if (!current.items.has(id)) return current;
      const items = new Map(current.items);
      items.delete(id);
      return {...current, items, revision: current.revision + 1};
    });
  }, []);
  const registerGroup = React.useCallback((group: RegisteredGroup): void => {
    setRegistry((current) => {
      const existing = current.groups.get(group.id);
      if (existing?.ref === group.ref && existing.parentId === group.parentId) return current;
      const groups = new Map(current.groups);
      groups.set(group.id, group);
      return {...current, groups, revision: current.revision + 1};
    });
  }, []);
  const unregisterGroup = React.useCallback((id: string): void => {
    setRegistry((current) => {
      if (!current.groups.has(id)) return current;
      const groups = new Map(current.groups);
      groups.delete(id);
      return {...current, groups, revision: current.revision + 1};
    });
  }, []);

  const isFiltering = shouldFilter && search.trim().length > 0;
  const rankedItems = React.useMemo(
    () =>
      [...registry.items.values()].map((item) => {
        const result = isFiltering ? filter(item.value, search, [...item.keywords]) : 1;
        const score = Number.isFinite(result) && result > 0 ? result : 0;
        return {item, score, visible: !item.hidden && (item.forceMount || !isFiltering || score > 0)};
      }),
    [filter, isFiltering, registry.items, search],
  );
  const groupRanks = React.useMemo(() => {
    const ranks = new Map<string, {score: number; order: number}>();
    for (const {item, score, visible} of rankedItems) {
      let groupId = visible ? item.groupId : null;
      const visited = new Set<string>();
      while (groupId && !visited.has(groupId)) {
        visited.add(groupId);
        const existing = ranks.get(groupId);
        ranks.set(groupId, {
          score: Math.max(existing?.score ?? 0, score),
          order: natural.get(groupId) ?? Number.MAX_SAFE_INTEGER,
        });
        groupId = registry.groups.get(groupId)?.parentId ?? null;
      }
    }
    return ranks;
  }, [natural, rankedItems, registry.groups]);
  const visibleItems = React.useMemo(() => {
    const paths = rankedItems
      .filter(({visible}) => visible)
      .map(({item, score}) => {
        const path = [{id: item.id, score, order: natural.get(item.id) ?? Number.MAX_SAFE_INTEGER}];
        let {groupId} = item;
        const visited = new Set<string>();
        while (groupId && !visited.has(groupId)) {
          visited.add(groupId);
          const rank = groupRanks.get(groupId);
          if (!rank) break;
          path.unshift({id: groupId, ...rank});
          groupId = registry.groups.get(groupId)?.parentId ?? null;
        }
        return {item, path};
      });
    return paths
      .toSorted((a, b) => {
        // Compare the first diverging siblings, keeping each ancestor's subtree together like the DOM.
        for (let index = 0; index < Math.min(a.path.length, b.path.length); index++) {
          const first = a.path[index];
          const second = b.path[index];
          if (first && second && first.id !== second.id)
            return (isFiltering ? second.score - first.score : 0) || first.order - second.order;
        }
        return 0;
      })
      .map(({item}) => item);
  }, [groupRanks, isFiltering, natural, rankedItems, registry.groups]);
  const selectableItems = React.useMemo(() => visibleItems.filter((item) => !item.disabled), [visibleItems]);
  const selectedValue = value ?? selection;
  const activeItem = selectableItems.find((item) => item.value === selectedValue) ?? (value === undefined ? selectableItems[0] : undefined);
  const activeItemId = activeItem?.id ?? null;

  // Guarded same-owner reconciliation remembers fallback without an extra effect render.
  const fallbackValue = activeItem?.value ?? "";
  if (value === undefined && registry.revision > 0 && selection !== fallbackValue) setSelection(fallbackValue);
  // Re-measure rendered order (keyed moves can bypass the registry), pin nodes to anchors, then drop the observer's records
  // of these already-handled mutations so Command's own placement never feeds back into the observer.
  const reconcileOrder = (): void => {
    measureOrder();
    const entries = new Map<string, RankedNode>();
    for (const {item, score} of rankedItems) {
      const node = item.ref.current;
      if (node) entries.set(item.id, {node, score});
    }
    for (const group of registry.groups.values()) {
      const node = group.ref.current;
      if (node) entries.set(group.id, {node, score: groupRanks.get(group.id)?.score ?? 0});
    }
    orderRegisteredNodes(entries, isFiltering, (snapshot) => {
      // Restoring this descendant is not a proposal; a caller's handoff to another option still is.
      restoringFocusRef.current = snapshot?.element ?? null;
      try {
        restoreRegisteredFocus(snapshot);
      } finally {
        restoringFocusRef.current = null;
      }
    });
    observerRef.current?.takeRecords();
  };
  React.useLayoutEffect(() => {
    reconcileRef.current = reconcileOrder;
    reconcileOrder();
  });
  React.useLayoutEffect(() => {
    const request = navigationFocusRequestRef.current;
    if (!request) return;
    if (!request.origin.isConnected || request.origin.ownerDocument.activeElement !== request.origin) {
      navigationFocusRequestRef.current = null;
      return;
    }
    if (activeItemId === request.targetId) {
      navigationFocusRequestRef.current = null;
      activeItem?.ref.current?.focus({preventScroll: true});
    } else if (activeItemId !== request.originId) {
      navigationFocusRequestRef.current = null;
    }
  }, [activeItem, activeItemId]);
  React.useEffect(() => {
    activeItem?.ref.current?.scrollIntoView({block: "nearest"});
  }, [activeItem]);

  const selectItem = React.useCallback(
    (id: string): void => {
      const item = selectableItems.find((candidate) => candidate.id === id);
      if (!item || item.value === selectedValue) return;
      if (value === undefined) setSelection(item.value);
      onValueChange?.(item.value);
    },
    [onValueChange, selectableItems, selectedValue, value],
  );

  const navigateToItem = (item: RegisteredItem, owner: Document): void => {
    const focused = owner.activeElement;
    const origin = focused instanceof HTMLElement ? registry.items.get(focused.id)?.ref.current : null;
    navigationFocusRequestRef.current = origin && origin === focused ? {origin, originId: origin.id, targetId: item.id} : null;
    selectItem(item.id);
    if (navigationFocusRequestRef.current && item.id === activeItemId) {
      navigationFocusRequestRef.current = null;
      item.ref.current?.focus({preventScroll: true});
    }
  };

  const context = React.useMemo<CommandContextValue>(
    () => ({
      activeItemId,
      disablePointerSelection,
      isFiltering,
      isItemVisible: (id) => visibleItems.some((item) => item.id === id),
      isRestoringFocus,
      hasVisibleItemsInGroup: (id) => groupRanks.has(id),
      label,
      listId,
      listRef,
      observeOrder,
      registerItem,
      unregisterItem,
      registerGroup,
      unregisterGroup,
      search,
      setSearch,
      setListId,
      selectItem,
      verifyOrder,
      visibleItemCount: visibleItems.length,
    }),
    [
      activeItemId,
      disablePointerSelection,
      isFiltering,
      isRestoringFocus,
      groupRanks,
      label,
      listId,
      registerGroup,
      registerItem,
      observeOrder,
      search,
      selectItem,
      unregisterGroup,
      unregisterItem,
      verifyOrder,
      visibleItems,
    ],
  );

  return (
    <CommandContext.Provider value={context}>
      <div
        ref={ref}
        data-slot='command'
        aria-label={props["aria-label"] ?? label}
        className={cn(styles.command, className)}
        role='toolbar'
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented || isNestedControl(event.target)) return;
          const request = navigationRequest(event, vimBindings);
          if (!request) return;
          if (request.kind === "activate") {
            if (activeItem) {
              event.preventDefault();
              activeItem.ref.current?.click();
            }
            return;
          }
          const item =
            request.kind === "endpoint"
              ? request.direction > 0
                ? selectableItems.at(-1)
                : selectableItems[0]
              : nextItem(selectableItems, activeItemId, request, loop);
          if (item) {
            event.preventDefault();
            navigateToItem(item, event.currentTarget.ownerDocument);
          }
        }}
        {...props}>
        {children}
      </div>
    </CommandContext.Provider>
  );
};
Command.displayName = "Command";

/**
 * Shared Dialog modal with real title/description and no implicit Command root.
 * Use `<CommandDialog><Command>…</Command></CommandDialog>` for canonical composition.
 */
const CommandDialog = ({
  ref,
  children,
  title = "Command menu",
  description = "Search for a command to run...",
  className,
  showCloseButton = false,
  closeLabel,
  ...props
}: Readonly<CommandDialogProps>): React.JSX.Element => (
  <Dialog {...props}>
    <DialogContent
      ref={ref}
      className={cn(styles.dialogPopup, className)}
      showCloseButton={showCloseButton}
      closeLabel={closeLabel}>
      <DialogTitle className={cn(styles.srOnly)}>{title}</DialogTitle>
      <DialogDescription className={cn(styles.srOnly)}>{description}</DialogDescription>
      {children}
    </DialogContent>
  </Dialog>
);
CommandDialog.displayName = "CommandDialog";

/** Search combobox composed with the real InputGroup chrome and native form input. */
const CommandInput = ({
  ref,
  className,
  onChange,
  onValueChange,
  value,
  defaultValue = "",
  ...props
}: Readonly<CommandInputProps>): React.JSX.Element => {
  const {activeItemId, listId, setSearch} = useCommandContext("CommandInput");
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const inputValue = value ?? uncontrolledValue;
  React.useLayoutEffect(() => {
    setSearch(inputValue);
  }, [inputValue, setSearch]);
  return (
    <div
      data-slot='command-input-wrapper'
      className={styles.inputWrapper}>
      <InputGroup className={styles.inputGroup}>
        <input
          ref={ref}
          data-slot='command-input'
          aria-label={props["aria-label"] ?? (props["aria-labelledby"] ? undefined : "Search commands")}
          aria-activedescendant={activeItemId ?? undefined}
          aria-autocomplete='list'
          aria-controls={listId}
          aria-expanded='true'
          className={cn(styles.input, className)}
          onChange={(event) => {
            onChange?.(event);
            if (event.defaultPrevented) return;
            const proposal = event.currentTarget.value;
            if (value === undefined) setUncontrolledValue(proposal);
            onValueChange?.(proposal);
          }}
          role='combobox'
          type='text'
          value={inputValue}
          {...props}
        />
        <InputGroupAddon>
          <Search
            aria-hidden='true'
            className={styles.searchIcon}
          />
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
};
CommandInput.displayName = "CommandInput";

/** Labelled listbox; a custom id is committed back to the input's aria-controls. */
const CommandList = ({ref, className, label, id, ...props}: Readonly<CommandListProps>): React.JSX.Element => {
  const {listId, listRef, observeOrder, setListId, label: rootLabel} = useCommandContext("CommandList");
  const mergedRef = useMergedRefs(listRef, ref);
  const generatedId = React.useId();
  const effectiveId = id ?? generatedId;
  React.useLayoutEffect(() => {
    setListId(effectiveId);
  }, [effectiveId, setListId]);
  React.useLayoutEffect(() => {
    const list = listRef.current;
    return list ? observeOrder(list) : undefined;
  }, [listRef, observeOrder]);
  return (
    <div
      ref={mergedRef}
      data-slot='command-list'
      aria-label={props["aria-label"] ?? (props["aria-labelledby"] ? undefined : (label ?? rootLabel))}
      className={cn(styles.list, className)}
      id={listId}
      role='listbox'
      {...props}
    />
  );
};
CommandList.displayName = "CommandList";

/** Live empty status. Force-mounted and disabled options still count as visible. */
const CommandEmpty = ({ref, className, ...props}: Readonly<CommandEmptyProps>): React.JSX.Element | null => {
  const {visibleItemCount} = useCommandContext("CommandEmpty");
  if (visibleItemCount > 0) return null;
  return (
    <div
      ref={ref}
      data-slot='command-empty'
      className={cn(styles.empty, className)}
      role='status'
      aria-live='polite'
      {...props}
    />
  );
};
CommandEmpty.displayName = "CommandEmpty";

/** Hidden, empty, never-moved position anchor that React renders first for each group/option, outside the accessibility tree. */
function CommandOrderAnchor({id}: Readonly<{id: string}>): React.JSX.Element {
  const {verifyOrder} = useCommandContext("CommandOrderAnchor");
  const anchorRef = React.useRef<HTMLSpanElement | null>(null);
  React.useLayoutEffect(() => {
    verifyOrder(anchorRef.current);
  });
  return (
    <span
      ref={anchorRef}
      hidden
      aria-hidden='true'
      className={styles.anchor}
      data-command-anchor={id}
    />
  );
}

/** Retains child registrations while hidden; the heading supplies the group's name; a hidden position anchor precedes it. */
const CommandGroup = ({
  ref,
  children,
  className,
  forceMount = false,
  heading,
  hidden,
  id,
  value,
  ...props
}: Readonly<CommandGroupProps>): React.JSX.Element => {
  const generatedId = React.useId();
  const groupId = id ?? generatedId;
  const headingId = `${groupId}-heading`;
  const parent = React.useContext(CommandGroupContext);
  const inheritedForceMount = forceMount || (parent?.forceMount ?? false);
  const externallyHidden = Boolean(hidden || parent?.hidden);
  const {hasVisibleItemsInGroup, isFiltering, registerGroup, unregisterGroup} = useCommandContext("CommandGroup");
  const groupRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(groupRef, ref);
  const groupContext = React.useMemo(
    () => ({id: groupId, forceMount: inheritedForceMount, hidden: externallyHidden}),
    [externallyHidden, groupId, inheritedForceMount],
  );
  React.useLayoutEffect(() => {
    registerGroup({id: groupId, parentId: parent?.id ?? null, ref: groupRef});
    return () => {
      unregisterGroup(groupId);
    };
  }, [groupId, parent?.id, registerGroup, unregisterGroup]);
  return (
    <CommandGroupContext.Provider value={groupContext}>
      <CommandOrderAnchor id={groupId} />
      <div
        ref={mergedRef}
        id={groupId}
        role='group'
        aria-labelledby={props["aria-labelledby"] ?? (heading !== undefined && heading !== null ? headingId : undefined)}
        className={cn(styles.group, className)}
        data-slot='command-group'
        data-command-group=''
        data-value={value}
        hidden={hidden || externallyHidden || (!inheritedForceMount && isFiltering && !hasVisibleItemsInGroup(groupId))}
        {...props}>
        {heading !== undefined && heading !== null ? (
          <div
            id={headingId}
            className={styles.groupHeading}>
            {heading}
          </div>
        ) : null}
        {children}
      </div>
    </CommandGroupContext.Provider>
  );
};
CommandGroup.displayName = "CommandGroup";

/** Primitive separator; native path retains orientation/render/state semantics. */
const CommandSeparator = ({
  ref,
  alwaysRender = false,
  className,
  orientation = "horizontal",
  ...props
}: Readonly<CommandSeparatorProps>): React.JSX.Element | null => {
  const {isFiltering} = useCommandContext("CommandSeparator");
  if (isFiltering && !alwaysRender) return null;
  return (
    <BaseSeparator
      ref={ref}
      data-slot='command-separator'
      className={typeof className === "function" ? (state) => cn(styles.separator, className(state)) : cn(styles.separator, className)}
      orientation={orientation}
      {...props}
    />
  );
};
CommandSeparator.displayName = "CommandSeparator";

const EMPTY_KEYWORDS: readonly string[] = [];

/** Native option with one activation path and caller-first cancellable handlers; a hidden position anchor precedes it. */
const CommandItem = ({
  ref,
  children,
  className,
  disabled = false,
  forceMount = false,
  hidden,
  keywords = EMPTY_KEYWORDS,
  onClick,
  onKeyDown,
  onFocus,
  onMouseEnter,
  onSelect,
  value,
  id,
  ...props
}: Readonly<CommandItemProps>): React.JSX.Element => {
  const {activeItemId, disablePointerSelection, isFiltering, isItemVisible, isRestoringFocus, registerItem, selectItem, unregisterItem} =
    useCommandContext("CommandItem");
  const group = React.useContext(CommandGroupContext);
  const generatedId = React.useId();
  const itemId = id ?? generatedId;
  const itemRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRefs(itemRef, ref);
  const inheritedForceMount = forceMount || (group?.forceMount ?? false);
  const externallyHidden = Boolean(hidden || group?.hidden);
  React.useLayoutEffect(() => {
    registerItem({
      disabled,
      forceMount: inheritedForceMount,
      hidden: externallyHidden,
      groupId: group?.id ?? null,
      id: itemId,
      keywords,
      ref: itemRef,
      value: value ?? itemRef.current?.textContent?.trim() ?? "",
    });
  }, [children, disabled, externallyHidden, group?.id, inheritedForceMount, itemId, keywords, registerItem, value]);
  React.useLayoutEffect(
    () => () => {
      unregisterItem(itemId);
    },
    [itemId, unregisterItem],
  );
  const isVisible = !externallyHidden && (inheritedForceMount || !isFiltering || isItemVisible(itemId));
  const isSelected = activeItemId === itemId;
  return (
    <>
      <CommandOrderAnchor id={itemId} />
      <div
        ref={mergedRef}
        data-slot='command-item'
        aria-disabled={disabled || undefined}
        aria-selected={isSelected}
        className={cn(styles.item, className)}
        data-disabled={disabled ? "true" : undefined}
        data-selected={isSelected ? "true" : undefined}
        hidden={hidden || !isVisible}
        id={itemId}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || isNestedControl(event.target)) return;
          if (disabled || !isVisible) {
            event.preventDefault();
            return;
          }
          selectItem(itemId);
          onSelect?.(value ?? itemRef.current?.textContent?.trim() ?? "");
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (
            event.defaultPrevented
            || isNestedControl(event.target)
            || event.nativeEvent.isComposing
            || event.ctrlKey
            || event.altKey
            || event.metaKey
            || event.shiftKey
          )
            return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!disabled && isVisible) event.currentTarget.click();
          }
        }}
        onFocus={(event) => {
          onFocus?.(event);
          if (!event.defaultPrevented && !isRestoringFocus(event.currentTarget) && !isNestedControl(event.target) && !disabled && isVisible)
            selectItem(itemId);
        }}
        onMouseEnter={(event) => {
          onMouseEnter?.(event);
          if (!event.defaultPrevented && !disabled && isVisible && !disablePointerSelection) selectItem(itemId);
        }}
        role='option'
        tabIndex={disabled ? -1 : (props.tabIndex ?? 0)}
        {...props}>
        {children}
      </div>
    </>
  );
};
CommandItem.displayName = "CommandItem";

/** Shortcut presentation with native span semantics and a React 19 ref prop. */
const CommandShortcut = ({ref, className, ...props}: Readonly<CommandShortcutProps>): React.JSX.Element => (
  <span
    ref={ref}
    data-slot='command-shortcut'
    className={cn(styles.shortcut, className)}
    {...props}
  />
);
CommandShortcut.displayName = "CommandShortcut";

/* eslint-disable no-redeclare, sonarjs/redundant-type-aliases -- canonical component namespace typing API */
namespace Command {
  export type Props = CommandProps;
}
namespace CommandDialog {
  export type Props = CommandDialogProps;
  export type State = Dialog.State;
}
namespace CommandInput {
  export type Props = CommandInputProps;
}
namespace CommandList {
  export type Props = CommandListProps;
}
namespace CommandEmpty {
  export type Props = CommandEmptyProps;
}
namespace CommandGroup {
  export type Props = CommandGroupProps;
}
namespace CommandSeparator {
  export type Props = CommandSeparatorProps;
  export type State = BaseSeparator.State;
}
namespace CommandItem {
  export type Props = CommandItemProps;
}
namespace CommandShortcut {
  export type Props = CommandShortcutProps;
}
/* eslint-enable no-redeclare, sonarjs/redundant-type-aliases */

export {Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut};
