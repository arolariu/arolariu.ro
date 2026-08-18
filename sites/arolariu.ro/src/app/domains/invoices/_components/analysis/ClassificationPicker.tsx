"use client";

/**
 * @fileoverview Accessible server-backed picker for manual taxonomy classifications.
 * @module app/domains/invoices/_components/analysis/ClassificationPicker
 */

import {searchClassifications} from "@/app/domains/invoices/_actions/analysis/searchClassifications";
import {
  ClassificationSystem,
  normalizeClassificationSearchQuery,
  type ClassificationSearchResult,
  type ClassificationSelection,
  type ClassificationSystem as ClassificationSystemValue,
} from "@/types/invoices";
import {Button, Input, Label, Popover, PopoverContent, PopoverTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect, useId, useMemo, useRef, useState, useTransition} from "react";
import {TbChevronDown, TbX} from "react-icons/tb";
import styles from "./ClassificationPicker.module.scss";

const MINIMUM_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 200;
const SEARCH_LIMIT = 20;

type SearchStatus = "idle" | "loading" | "success" | "error";

/**
 * Represents the view state for one classification-search request.
 */
export interface ClassificationSearchState {
  /** Current status of the request. */
  readonly status: SearchStatus;
  /** Monotonically increasing request identifier. */
  readonly requestId: number;
  /** Bounded official taxonomy projections available for selection. */
  readonly results: readonly ClassificationSearchResult[];
}

type ClassificationSearchAction =
  | Readonly<{type: "loading"; requestId: number}>
  | Readonly<{type: "success"; requestId: number; results: readonly ClassificationSearchResult[]}>
  | Readonly<{type: "error"; requestId: number; error: string}>
  | Readonly<{type: "reset"}>;

/**
 * Applies a request-scoped classification search transition.
 *
 * @param state - The current visible picker search state.
 * @param action - The request transition to apply.
 * @returns The next state, retaining newer results when a stale result arrives.
 */
export function classificationSearchReducer(
  state: ClassificationSearchState,
  action: ClassificationSearchAction,
): ClassificationSearchState {
  switch (action.type) {
    case "loading":
      return {status: "loading", requestId: action.requestId, results: []};
    case "success":
      return state.requestId === action.requestId ? {status: "success", requestId: action.requestId, results: action.results} : state;
    case "error":
      return state.requestId === action.requestId ? {status: "error", requestId: action.requestId, results: []} : state;
    case "reset":
      return {status: "idle", requestId: state.requestId, results: []};
  }
}

/**
 * Creates a monotonic request sequencer used to discard stale async completions.
 *
 * @returns A request controller whose current sequence can be checked after an
 * asynchronous server-action result settles.
 */
export function createLatestRequestController(): Readonly<{
  begin: () => number;
  invalidate: () => void;
  isLatest: (requestId: number) => boolean;
}> {
  let currentRequestId = 0;

  return {
    begin: (): number => {
      currentRequestId += 1;
      return currentRequestId;
    },
    invalidate: (): void => {
      currentRequestId += 1;
    },
    isLatest: (requestId: number): boolean => currentRequestId === requestId,
  };
}

/**
 * Provides request sequencing that invalidates stale work on dependency changes.
 *
 * @remarks
 * ClassificationPicker uses this hook to ensure an older server-action success
 * or error cannot overwrite a newer query, a new taxonomy system, or unmounted
 * UI.
 *
 * @param invalidationKey - Taxonomy system whose change makes pending work stale.
 * @returns A stable monotonic request controller for the mounted component.
 */
export function useLatestRequestController(invalidationKey: ClassificationSystemValue): Readonly<{
  begin: () => number;
  invalidate: () => void;
  isLatest: (requestId: number) => boolean;
}> {
  const controllerReference = useRef(createLatestRequestController());

  useEffect(() => {
    controllerReference.current.invalidate();
    return () => {
      controllerReference.current.invalidate();
    };
  }, [invalidationKey]);

  return controllerReference.current;
}

/**
 * Builds the bounded server-action input for a normalized picker query.
 *
 * @param system - Taxonomy system to query.
 * @param query - User-entered search query.
 * @returns The bounded, normalized search-action payload.
 */
export function createClassificationSearchInput(
  system: ClassificationSystemValue,
  query: string,
): Readonly<{system: ClassificationSystemValue; query: string; limit: number}> {
  return {
    system,
    query: normalizeQuery(query),
    limit: SEARCH_LIMIT,
  };
}

interface ClassificationPickerProps {
  /** Taxonomy system that constrains all searches and selections. */
  readonly system: ClassificationSystemValue;
  /** Existing selection, if one has been persisted or staged by the parent. */
  readonly value: ClassificationSelection | null;
  /** Receives a code-only selection, or null after an allowed clear operation. */
  readonly onChange: (value: ClassificationSelection | null) => void;
  /** Prevents opening, searching, selection, and clearing. */
  readonly disabled?: boolean;
  /** Whether this integration has a backend-supported clear operation. @defaultValue true */
  readonly allowClear?: boolean;
}

function normalizeQuery(query: string): string {
  return normalizeClassificationSearchQuery(query);
}

/**
 * Provides a keyboard-first manual classification search without exposing a taxonomy artifact.
 *
 * @remarks
 * Search requests are intentionally sent only to the bounded server action and
 * contain a system, normalized query, and a cap of twenty results. Clearability
 * is an explicit parent decision because mutation contracts, rather than
 * taxonomy systems, determine whether a null selection is meaningful.
 *
 * @param props - Picker configuration and controlled selection value.
 * @returns A searchable combobox with canonical result projections.
 */
export function ClassificationPicker({
  system,
  value,
  onChange,
  disabled = false,
  allowClear = true,
}: Readonly<ClassificationPickerProps>): React.JSX.Element {
  const t = useTranslations();
  const inputId = useId();
  const labelId = useId();
  const listboxId = useId();
  const inputReference = useRef<HTMLInputElement | null>(null);
  const triggerReference = useRef<HTMLButtonElement | null>(null);
  const mountedReference = useRef(true);
  const debounceReference = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestController = useLatestRequestController(system);
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedPresentation, setSelectedPresentation] = useState<ClassificationSearchResult | null>(null);
  const [searchState, setSearchState] = useState<ClassificationSearchState>({
    status: "idle",
    requestId: 0,
    results: [],
  });

  const systemLabel = useMemo((): string => {
    switch (system) {
      case ClassificationSystem.Gs1Gpc:
        return t((messages) => messages.forms.invoices.classificationPicker.systems.gs1Gpc);
      case ClassificationSystem.EcoicopV2:
        return t((messages) => messages.forms.invoices.classificationPicker.systems.ecoicopV2);
      case ClassificationSystem.Nace21:
        return t((messages) => messages.forms.invoices.classificationPicker.systems.nace21);
    }
  }, [system, t]);

  const selectedResult = useMemo((): ClassificationSearchResult | null => {
    if (value === null) {
      return null;
    }

    return (
      searchState.results.find((result) => result.system === value.system && result.code === value.code)
      ?? (selectedPresentation?.system === value.system && selectedPresentation.code === value.code ? selectedPresentation : null)
    );
  }, [searchState.results, selectedPresentation, value]);

  const clearPendingWork = useCallback((): void => {
    if (debounceReference.current !== null) {
      clearTimeout(debounceReference.current);
      debounceReference.current = null;
    }

    requestController.invalidate();
  }, [requestController]);

  const selectResult = useCallback(
    (result: ClassificationSearchResult): void => {
      setSelectedPresentation(result);
      onChange({system: result.system, code: result.code});
      setIsOpen(false);
      setHighlightedIndex(-1);
      triggerReference.current?.focus();
    },
    [onChange],
  );

  const executeSearch = useCallback(
    (normalizedQuery: string, requestId: number): void => {
      startTransition(() => {
        setSearchState((state) => classificationSearchReducer(state, {type: "loading", requestId}));
      });

      void searchClassifications(createClassificationSearchInput(system, normalizedQuery))
        .then((result) => {
          if (!mountedReference.current || !requestController.isLatest(requestId)) {
            return;
          }

          startTransition(() => {
            if (result.success) {
              setSearchState((state) => classificationSearchReducer(state, {type: "success", requestId, results: result.data}));
              setHighlightedIndex(result.data.length > 0 ? 0 : -1);
              return;
            }

            setSearchState((state) => classificationSearchReducer(state, {type: "error", requestId, error: result.error.message}));
            setHighlightedIndex(-1);
          });
        })
        .catch(() => {
          if (!mountedReference.current || !requestController.isLatest(requestId)) {
            return;
          }

          startTransition(() => {
            setSearchState((state) => classificationSearchReducer(state, {type: "error", requestId, error: "request-failed"}));
            setHighlightedIndex(-1);
          });
        });
    },
    [requestController, startTransition, system],
  );

  const handleQueryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const nextQuery = event.target.value;
      const normalizedQuery = normalizeQuery(nextQuery);
      setQuery(nextQuery);
      setHighlightedIndex(-1);
      clearPendingWork();

      if (normalizedQuery.length < MINIMUM_QUERY_LENGTH) {
        setSearchState((state) => classificationSearchReducer(state, {type: "reset"}));
        return;
      }

      const requestId = requestController.begin();
      debounceReference.current = setTimeout(() => {
        debounceReference.current = null;
        if (!mountedReference.current || !requestController.isLatest(requestId)) {
          return;
        }

        executeSearch(normalizedQuery, requestId);
      }, SEARCH_DEBOUNCE_MS);
    },
    [clearPendingWork, executeSearch, requestController],
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      const results = searchState.results;
      if (event.key === "ArrowDown" && results.length > 0) {
        event.preventDefault();
        setHighlightedIndex((index) => (index + 1) % results.length);
        return;
      }

      if (event.key === "ArrowUp" && results.length > 0) {
        event.preventDefault();
        setHighlightedIndex((index) => (index <= 0 ? results.length - 1 : index - 1));
        return;
      }

      if (event.key === "Enter" && highlightedIndex >= 0) {
        const highlightedResult = results.at(highlightedIndex);
        if (highlightedResult !== undefined) {
          event.preventDefault();
          selectResult(highlightedResult);
        }
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        triggerReference.current?.focus();
        return;
      }

      if (event.key === "Tab") {
        setIsOpen(false);
      }
    },
    [highlightedIndex, searchState.results, selectResult],
  );

  const handleClear = useCallback((): void => {
    clearPendingWork();
    setQuery("");
    setHighlightedIndex(-1);
    setSelectedPresentation(null);
    setSearchState((state) => classificationSearchReducer(state, {type: "reset"}));
    onChange(null);
  }, [clearPendingWork, onChange]);

  const handleOpenChange = useCallback((open: boolean): void => {
    setIsOpen(open);
    if (!open) {
      setHighlightedIndex(-1);
    }
  }, []);

  useEffect(() => {
    mountedReference.current = true;
    setQuery("");
    setHighlightedIndex(-1);
    setSearchState((state) => classificationSearchReducer(state, {type: "reset"}));

    return () => {
      mountedReference.current = false;
      clearPendingWork();
    };
  }, [clearPendingWork, system]);

  useEffect(() => {
    if (isOpen) {
      inputReference.current?.focus();
    }
  }, [isOpen]);

  const normalizedQuery = normalizeQuery(query);
  const hasSearchableQuery = normalizedQuery.length >= MINIMUM_QUERY_LENGTH;
  const activeResult = searchState.results.at(highlightedIndex);
  const activeDescendant = activeResult === undefined ? undefined : `${listboxId}-${activeResult.code}`;
  const clearAllowed = allowClear && value !== null;

  return (
    <div className={styles["field"]}>
      <Label
        id={labelId}
        htmlFor={inputId}
        className={styles["label"]}>
        {systemLabel}
      </Label>
      <Popover
        open={isOpen}
        onOpenChange={handleOpenChange}>
        <div className={styles["controlRow"]}>
          <PopoverTrigger
            render={
              <Button
                ref={triggerReference}
                type='button'
                variant='outline'
                aria-label={systemLabel}
                aria-haspopup='listbox'
                className={styles["trigger"]}
                disabled={disabled}>
                <span className={styles["triggerText"]}>
                  {selectedResult === null
                    ? value === null
                      ? t((messages) => messages.forms.invoices.classificationPicker.placeholder)
                      : t((messages) => messages.forms.invoices.classificationPicker.selectedCode, {
                          system: value.system,
                          code: value.code,
                        })
                    : t((messages) => messages.forms.invoices.classificationPicker.selectedResult, {
                        code: selectedResult.code,
                        label: selectedResult.officialLabel,
                      })}
                </span>
                <TbChevronDown
                  aria-hidden='true'
                  className={styles["triggerIcon"]}
                />
              </Button>
            }
          />
          {clearAllowed ? (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              aria-label={t((messages) => messages.forms.invoices.classificationPicker.clear, {system: systemLabel})}
              className={styles["clearButton"]}
              disabled={disabled}
              onClick={handleClear}>
              <TbX aria-hidden='true' />
            </Button>
          ) : null}
        </div>
        <PopoverContent
          className={styles["popoverContent"]}
          sideOffset={4}>
          <Input
            ref={inputReference}
            id={inputId}
            type='search'
            role='combobox'
            aria-labelledby={labelId}
            aria-autocomplete='list'
            aria-expanded={isOpen}
            aria-controls={hasSearchableQuery && searchState.status === "success" ? listboxId : undefined}
            aria-activedescendant={activeDescendant}
            aria-busy={searchState.status === "loading" || isPending}
            value={query}
            placeholder={t((messages) => messages.forms.invoices.classificationPicker.searchPlaceholder)}
            disabled={disabled}
            className={styles["searchInput"]}
            onChange={handleQueryChange}
            onKeyDown={handleInputKeyDown}
          />

          {!hasSearchableQuery ? (
            <p
              className={styles["feedback"]}
              role='status'
              aria-live='polite'>
              {t((messages) => messages.forms.invoices.classificationPicker.minimumCharacters, {count: String(MINIMUM_QUERY_LENGTH)})}
            </p>
          ) : null}

          {searchState.status === "loading" || isPending ? (
            <p
              className={styles["feedback"]}
              role='status'
              aria-live='polite'>
              {t((messages) => messages.forms.invoices.classificationPicker.loading)}
            </p>
          ) : null}

          {searchState.status === "error" ? (
            <p
              className={styles["feedbackError"]}
              role='alert'>
              {t((messages) => messages.forms.invoices.classificationPicker.error)}
            </p>
          ) : null}

          {searchState.status === "success" && searchState.results.length === 0 ? (
            <p
              className={styles["feedback"]}
              role='status'
              aria-live='polite'>
              {t((messages) => messages.forms.invoices.classificationPicker.empty)}
            </p>
          ) : null}

          {searchState.status === "success" && searchState.results.length > 0 ? (
            <ul
              id={listboxId}
              role='listbox'
              aria-label={systemLabel}
              className={styles["results"]}>
              {searchState.results.map((result, index) => {
                const isSelected = value?.system === result.system && value.code === result.code;
                const isActive = index === highlightedIndex;
                const hierarchyPath = result.hierarchyLabels.join(" › ");

                return (
                  <li
                    key={`${result.system}-${result.code}`}
                    role='presentation'
                    data-active={isActive || undefined}
                    className={styles["result"]}>
                    <Button
                      id={`${listboxId}-${result.code}`}
                      type='button'
                      variant='ghost'
                      role='option'
                      aria-selected={isSelected}
                      data-active={isActive || undefined}
                      className={styles["resultButton"]}
                      aria-label={t((messages) => messages.forms.invoices.classificationPicker.result, {
                        code: result.code,
                        label: result.officialLabel,
                      })}
                      onMouseMove={() => {
                        setHighlightedIndex(index);
                      }}
                      onClick={() => {
                        selectResult(result);
                      }}>
                      <span className={styles["resultHeader"]}>
                        <span className={styles["resultCode"]}>{result.code}</span>
                        <span className={styles["resultLabel"]}>{result.officialLabel}</span>
                      </span>
                      <span className={styles["resultPath"]}>{hierarchyPath}</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
