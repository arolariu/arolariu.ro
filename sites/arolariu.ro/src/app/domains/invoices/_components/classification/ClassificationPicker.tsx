"use client";

/**
 * @fileoverview Accessible combobox for manual taxonomy classification selection.
 * @module app/domains/invoices/_components/classification/ClassificationPicker
 *
 * @remarks
 * Implements the ARIA 1.2 combobox pattern with keyboard navigation and
 * stale-response protection. Debounces input before searching and discards
 * any in-flight result that was superseded by a newer request.
 *
 * **Stale-response protection** is the primary correctness invariant: a
 * monotonically increasing request generation (`requestGenerationRef`) is
 * incremented on every query input change. Each delayed request captures that
 * generation, and its result is discarded if the query has since changed.
 *
 * **Rendering context**: Client Component (`"use client"`) — uses event
 * handlers, local state, and refs.
 */

import {useCallback, useEffect, useId, useRef, useState} from "react";
import {useTranslations} from "next-intl-selector";
import {searchClassifications} from "@/app/domains/invoices/_actions/analysis/searchClassifications";
import {
  normalizeClassificationSearchQuery,
  type ClassificationSearchResult,
  type ClassificationSelection,
  type ClassificationSystem,
} from "@/types/invoices";
import styles from "./ClassificationPicker.module.scss";

/** Minimum normalized query length required to trigger a search. Mirrors the server action's invariant. */
const MIN_QUERY_LENGTH = 2;

/** Debounce delay in milliseconds before a search is issued. */
const DEBOUNCE_MS = 300;

/**
 * Maximum number of options displayed at once. Mirrors the server action's documented
 * result cap so the component never renders more than the action can return.
 */
const MAX_DISPLAY_RESULTS = 50;

/** Props for {@link ClassificationPicker}. */
type Props = {
  /** The taxonomy system to search within. */
  readonly system: ClassificationSystem;
  /** Current selection (controlled), or `null` when nothing is selected. */
  readonly value: ClassificationSelection | null;
  /**
   * Called when the user selects or clears a classification.
   *
   * @remarks
   * Emits exactly `{system, code}` on selection, or `null` on clear.
   * No extra fields are included — write actions map this to `classificationCode`.
   *
   * @param selection - The selected taxonomy code pair, or `null`.
   */
  readonly onChange: (selection: ClassificationSelection | null) => void;
  /** Accessible label rendered above the input and on the listbox. */
  readonly label: string;
  /** When `true`, all interactive controls are disabled. */
  readonly disabled?: boolean;
};

/**
 * Reusable combobox that lets users search and select a canonical taxonomy code.
 *
 * @remarks
 * - Debounces input by {@link DEBOUNCE_MS}ms before issuing a search.
 * - Enforces the server-side minimum query length ({@link MIN_QUERY_LENGTH} normalized chars).
 * - Protects against stale responses via a monotonically increasing request generation.
 * - Supports full keyboard navigation: ArrowDown / ArrowUp / Enter / Escape.
 * - Emits exactly `{system, code}` on selection; clear emits `null`.
 * - Cleans up any pending debounce timer on unmount.
 *
 * @param props - Component properties.
 * @returns The classification combobox element.
 */
export default function ClassificationPicker({system, value, onChange, label, disabled = false}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const listboxId = useId();
  const inputId = `${listboxId}-input`;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly ClassificationSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  /** Pending debounce timer handle. */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Monotonically increasing query generation.
   * Incremented on every input change and compared when requests resolve.
   */
  const requestGenerationRef = useRef(0);

  /** Invalidates delayed or in-flight searches and clears the active debounce. */
  const invalidatePendingSearch = useCallback((): number => {
    requestGenerationRef.current += 1;
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    return requestGenerationRef.current;
  }, []);

  // Clean up any pending debounce timer when the component unmounts.
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  /** Executes a delayed search and applies it only while its query generation is current. */
  const performSearch = useCallback(
    async (raw: string, requestGeneration: number): Promise<void> => {
      const result = await searchClassifications({system, query: raw});

      // Discard whenever the query changed after this request was scheduled.
      if (requestGeneration !== requestGenerationRef.current) return;

      if (result.success) {
        const bounded = result.data.slice(0, MAX_DISPLAY_RESULTS);
        setResults(bounded);
        setIsOpen(bounded.length > 0);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    },
    [system],
  );

  /** Handles input text changes: debounces and guards minimum query length. */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      // Invalidate every older request immediately, including when this query
      // is cleared or becomes too short to schedule a replacement request.
      const requestGeneration = invalidatePendingSearch();

      if (value !== null) onChange(null);
      setQuery(raw);
      setActiveIndex(-1);

      if (normalizeClassificationSearchQuery(raw).length < MIN_QUERY_LENGTH) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        void performSearch(raw, requestGeneration);
      }, DEBOUNCE_MS);
    },
    [invalidatePendingSearch, onChange, performSearch, value],
  );

  /** Selects the displayed controlled code so typing replaces it with a new query. */
  const handleInputFocus = useCallback(
    (event: React.FocusEvent<HTMLInputElement>): void => {
      if (query.length === 0 && value !== null) event.currentTarget.select();
    },
    [query.length, value],
  );

  /** Handles keyboard navigation and selection within the combobox. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (!isOpen && results.length > 0) {
            setIsOpen(true);
            setActiveIndex(0);
            return;
          }
          if (isOpen && results.length > 0) {
            setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
          }
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          if (isOpen) {
            setActiveIndex((prev) => Math.max(prev - 1, 0));
          }
          break;
        }
        case "Enter": {
          if (isOpen && activeIndex >= 0) {
            const selected = results[activeIndex];
            if (selected !== undefined) {
              e.preventDefault();
              invalidatePendingSearch();
              onChange({system: selected.system, code: selected.code});
              setIsOpen(false);
              setQuery("");
              setResults([]);
              setActiveIndex(-1);
            }
          }
          break;
        }
        case "Escape": {
          e.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
          break;
        }
        default:
          break;
      }
    },
    [isOpen, results, activeIndex, invalidatePendingSearch, onChange],
  );

  /** Selects a result by code and closes the listbox. */
  const selectOptionByCode = useCallback(
    (code: string | undefined): void => {
      const result = results.find((candidate) => candidate.code === code);
      if (result === undefined) throw new Error(`Classification option not found: ${code ?? "missing"}`);

      invalidatePendingSearch();
      onChange({system: result.system, code: result.code});
      setIsOpen(false);
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
    },
    [invalidatePendingSearch, onChange, results],
  );

  /** Selects the result identified by a clicked option. */
  const handleOptionClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>): void => {
      selectOptionByCode(event.currentTarget.dataset["code"]);
    },
    [selectOptionByCode],
  );

  /** Supports direct keyboard activation if an option receives focus. */
  const handleOptionKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): void => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectOptionByCode(event.currentTarget.dataset["code"]);
      }
    },
    [selectOptionByCode],
  );

  /** Keeps the combobox focused while an option is clicked. */
  const handleOptionMouseDown = useCallback((event: React.MouseEvent<HTMLDivElement>): void => {
    event.preventDefault();
  }, []);

  /** Clears the current value and resets the combobox state. */
  const handleClear = useCallback(() => {
    invalidatePendingSearch();
    onChange(null);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
  }, [invalidatePendingSearch, onChange]);

  const activeOptionId = isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;
  const displayedValue = query.length === 0 && value !== null ? value.code : query;

  return (
    <div className={styles["container"]}>
      <label
        htmlFor={inputId}
        className={styles["label"]}>
        {label}
      </label>

      <div className={styles["inputWrapper"]}>
        <input
          id={inputId}
          role='combobox'
          type='text'
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete='list'
          aria-activedescendant={activeOptionId}
          aria-disabled={disabled}
          className={styles["input"]}
          value={displayedValue}
          placeholder={t((m) => m.dialogs.invoices.classificationPicker.placeholder)}
          disabled={disabled}
          autoComplete='off'
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
        />
        {(value !== null || query.length > 0) && (
          <button
            type='button'
            className={styles["clearButton"]}
            aria-label={t((m) => m.dialogs.invoices.classificationPicker.clear)}
            onClick={handleClear}
            disabled={disabled}>
            ×
          </button>
        )}
      </div>

      {isOpen ? (
        <div
          id={listboxId}
          role='listbox'
          aria-label={label}
          className={styles["listbox"]}>
          {results.map((result, index) => (
            <div
              key={result.code}
              id={`${listboxId}-option-${index}`}
              role='option'
              tabIndex={-1}
              data-code={result.code}
              aria-selected={index === activeIndex}
              className={`${styles["option"] ?? ""} ${index === activeIndex ? (styles["optionActive"] ?? "") : ""}`}
              onMouseDown={handleOptionMouseDown}
              onClick={handleOptionClick}
              onKeyDown={handleOptionKeyDown}>
              <span className={styles["optionLabel"]}>{result.officialLabel}</span>
              <span className={styles["optionCode"]}>{result.code}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
