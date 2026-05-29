"use client";

/**
 * @fileoverview Hook for managing local scan rename behavior.
 * @module app/domains/invoices/_hooks/scan/useScanRename
 *
 * @remarks
 * Provides local rename state and updates the scans Zustand store. Despite the
 * historical file summary, this hook does not call a server action; scan rename
 * is local client state.
 */

import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {toast} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useRef, useState} from "react";

/**
 * Hook output type for scan rename UI state.
 */
type HookOutputType = Readonly<{
  /** Current name value in the input field */
  value: string;
  /** Whether the rename mode is active */
  isEditing: boolean;
  /** Reserved commit flag; currently remains false because rename is a synchronous store update. */
  isCommitting: boolean;
  /** Flash flag to indicate successful rename (resets after 300ms) */
  justRenamed: boolean;
  /** Ref to the input element for focus management */
  inputRef: React.RefObject<HTMLInputElement | null>;
  /** Enters rename mode */
  start: () => void;
  /** Exits rename mode and restores original name */
  cancel: () => void;
  /** Updates the current input value */
  change: (newValue: string) => void;
  /** Commits the rename operation */
  commit: () => Promise<void>;
}>;

/**
 * Manages scan rename state and local store updates.
 *
 * @remarks
 * **Behavior contract:**
 * - `start()` sets `isEditing→true` and initializes `value` to scan name
 * - `cancel()` restores original name and sets `isEditing→false`
 * - `change(newValue)` updates the current input value
 * - `commit()` when value differs and non-empty:
 *   1. Updates Zustand store via `updateScanName`
 *   2. Shows success toast
 *   3. Sets `isEditing→false`
 *   4. Flashes `justRenamed→true` for 300ms
 * - `commit()` when value is empty/unchanged: silently exits editing mode
 *
 * **Focus management:**
 * - `inputRef` can be used to focus the input field when entering rename mode
 *
 * @param scan - The scan to rename locally.
 * @returns Hook state and handlers for rename mode, editing, and commit actions.
 *
 * @example
 * ```tsx
 * const rename = useScanRename(scan);
 *
 * return (
 *   <>
 *     {rename.isEditing ? (
 *       <Input
 *         ref={rename.inputRef}
 *         value={rename.value}
 *         onChange={(e) => rename.change(e.target.value)}
 *         onKeyDown={(e) => {
 *           if (e.key === "Enter") rename.commit();
 *           if (e.key === "Escape") rename.cancel();
 *         }}
 *       />
 *     ) : (
 *       <span onDoubleClick={rename.start}>{scan.name}</span>
 *     )}
 *   </>
 * );
 * ```
 */
export function useScanRename(scan: CachedScan): Readonly<HookOutputType> {
  const t = useTranslations();
  const updateScanName = useScansStore((state) => state.updateScanName);

  const [value, setValue] = useState(scan.name);
  const [isEditing, setIsEditing] = useState(false);
  const isCommitting = false;
  const [justRenamed, setJustRenamed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const start = useCallback((): void => {
    setIsEditing(true);
    setValue(scan.name);
  }, [scan.name]);

  const cancel = useCallback((): void => {
    setIsEditing(false);
    setValue(scan.name);
  }, [scan.name]);

  const change = useCallback((newValue: string): void => {
    setValue(newValue);
  }, []);

  const commit = useCallback(async (): Promise<void> => {
    const trimmedValue = value.trim();

    // Silently exit if value is empty or unchanged
    if (!trimmedValue || trimmedValue === scan.name) {
      setIsEditing(false);
      return;
    }

    // Update store locally (no server action needed for rename)
    updateScanName(scan.id, trimmedValue);
    toast.success(t((m) => m.pages.invoices.viewScans.scanCard.rename));
    setIsEditing(false);
    setJustRenamed(true);
    setTimeout(() => setJustRenamed(false), 300);
  }, [value, scan.name, scan.id, updateScanName, t]);

  return {
    value,
    isEditing,
    isCommitting,
    justRenamed,
    inputRef,
    start,
    cancel,
    change,
    commit,
  };
}
