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
 * monotonically increasing request counter (`requestIdRef`) is incremented
 * before each fetch; on resolve the result is discarded when the counter has
 * advanced beyond the value captured at dispatch time.
 *
 * **Rendering context**: Client Component (`"use client"`) — uses event
 * handlers, local state, and refs.
 */

import {useCallback, useEffect, useId, useRef, useState} from "react";
import {useTranslations} from "next-intl-selector";
import {searchClassifications} from "@/app/domains/invoices/_actions/analysis/searchClassifications";
import {normalizeClassificationSearchQuery} from "@/types/invoices";
import type {
  ClassificationSearchResult,
  ClassificationSelection,
  ClassificationSystem,
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
export interface ClassificationPickerProps {
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
}

/**
 * Reusable combobox that lets users search and select a canonical taxonomy code.
 *
 * @remarks
 * - Debounces input by {@link DEBOUNCE_MS}ms before issuing a search.
 * - Enforces the server-side minimum query length ({@link MIN_QUERY_LENGTH} normalized chars).
 * - Protects against stale responses via a monotonically increasing `requestIdRef`.
 * - Supports full keyboard navigation: ArrowDown / ArrowUp / Enter / Escape.
 * - Emits exactly `{system, code}` on selection; clear emits `null`.
 * - Cleans up any pending debounce timer on unmount.
 *
 * @param props - {@link ClassificationPickerProps}
 * @returns The classification combobox element.
 */
export default function ClassificationPicker({
  system,
  value,
  onChange,
  label,
  disabled = false,
}: Readonly<ClassificationPickerProps>): React.JSX.Element {
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
   * Monotonically increasing request identifier.
   * Incremented before each fetch; compared on resolve to detect stale responses.
   */
  const requestIdRef = useRef(0);

  // Clean up any pending debounce timer when the component unmounts.
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  /** Handles input text changes: debounces and guards minimum query length. */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setQuery(raw);
      setActiveIndex(-1);

      if (debounceRef.current !== null) clearTimeout(debounceRef.current);

      if (normalizeClassificationSearchQuery(raw).length < MIN_QUERY_LENGTH) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        // Capture the new request id before the async fetch — this is the stale-response guard.
        requestIdRef.current += 1;
        const myId = requestIdRef.current;

        void searchClassifications({system, query: raw}).then((result) => {
          // Discard if a newer request has been issued while this one was in-flight.
          if (myId !== requestIdRef.current) return;

          if (result.success) {
            const bounded = result.data.slice(0, MAX_DISPLAY_RESULTS);
            setResults(bounded);
            setIsOpen(bounded.length > 0);
          } else {
            setResults([]);
            setIsOpen(false);
          }
        });
      }, DEBOUNCE_MS);
    },
    [system],
  );

  /** Handles keyboard navigation and selection within the combobox. */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen && results.length > 0) {
          setIsOpen(true);
          setActiveIndex(0);
          return;
        }
        if (isOpen && results.length > 0) {
          setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (isOpen) {
          setActiveIndex((prev) => Math.max(prev - 1, 0));
        }
      } else if (e.key === "Enter") {
        if (isOpen && activeIndex >= 0) {
          const selected = results[activeIndex];
          if (selected !== undefined) {
            e.preventDefault();
            onChange({system: selected.system, code: selected.code});
            setIsOpen(false);
            setQuery("");
            setResults([]);
            setActiveIndex(-1);
          }
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
      }
    },
    [isOpen, results, activeIndex, onChange],
  );

  /** Selects the given result and closes the listbox. */
  const handleOptionClick = useCallback(
    (result: ClassificationSearchResult) => {
      onChange({system: result.system, code: result.code});
      setIsOpen(false);
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
    },
    [onChange],
  );

  /** Clears the current value and resets the combobox state. */
  const handleClear = useCallback(() => {
    onChange(null);
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setActiveIndex(-1);
  }, [onChange]);

  const activeOptionId =
    isOpen && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div className={styles["container"]}>
      <label htmlFor={inputId} className={styles["label"]}>
        {label}
      </label>

      <div className={styles["inputWrapper"]}>
        <input
          id={inputId}
          role="combobox"
          type="text"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-disabled={disabled}
          className={styles["input"]}
          value={query}
          placeholder={t((m) => m.dialogs.invoices.classificationPicker.placeholder)}
          disabled={disabled}
          autoComplete="off"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        {value !== null && (
          <button
            type="button"
            className={styles["clearButton"]}
            aria-label={t((m) => m.dialogs.invoices.classificationPicker.clear)}
            onClick={handleClear}
            disabled={disabled}
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (
        <ul id={listboxId} role="listbox" aria-label={label} className={styles["listbox"]}>
          {results.map((result, index) => (
            <li
              key={result.code}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`${styles["option"] ?? ""} ${index === activeIndex ? (styles["optionActive"] ?? "") : ""}`}
              onMouseDown={(e) => {
                // Prevent the input from losing focus before the click fires.
                e.preventDefault();
              }}
              onClick={() => {
                handleOptionClick(result);
              }}
            >
              <span className={styles["optionLabel"]}>{result.officialLabel}</span>
              <span className={styles["optionCode"]}>{result.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
