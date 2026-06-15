"use client";

/**
 * @fileoverview React hook for post-upload prompt timing.
 * @module app/domains/invoices/upload-scans/_hooks/usePostUploadPrompt
 *
 * @remarks
 * The upload page shows a follow-up prompt after a completed batch leaves the
 * queue. This hook isolates that timing from the page island so navigation
 * handlers can focus only on routing.
 */

import {useCallback, useEffect, useRef, useState} from "react";
import {POST_UPLOAD_PROMPT_DELAY_MS} from "../_model/constants";
import type {UploadCompletionSummary} from "../_types";

type HookInput = Readonly<{
  /** Number of upload cards still present in the queue. */
  pendingUploadCount: number;
  /** Session count of successfully completed uploads. */
  totalCompleted: number;
  /** Completed uploads available for prompt thumbnails. */
  completedBatch: readonly UploadCompletionSummary[];
  /** Clears completed batch state after prompt data has been copied locally. */
  clearCompletedBatch: () => void;
}>;

type HookOutput = Readonly<{
  /** Whether the prompt should be visible. */
  isVisible: boolean;
  /** Completed scans displayed by the prompt. */
  completedScans: UploadCompletionSummary[];
  /** Hides the prompt. */
  dismissPrompt: () => void;
}>;

/**
 * Shows the post-upload prompt once per completed batch.
 *
 * @param input - Prompt trigger state and cleanup callback.
 * @returns Prompt visibility, copied completed scans, and dismiss action.
 */
export function usePostUploadPrompt({
  pendingUploadCount,
  totalCompleted,
  completedBatch,
  clearCompletedBatch,
}: HookInput): HookOutput {
  const [isVisible, setIsVisible] = useState(false);
  const [completedScans, setCompletedScans] = useState<UploadCompletionSummary[]>([]);
  const hasPromptedRef = useRef(false);

  useEffect(() => {
    if (pendingUploadCount > 0) {
      hasPromptedRef.current = false;
    }
  }, [pendingUploadCount]);

  useEffect(() => {
    const allDone = pendingUploadCount === 0 && totalCompleted > 0 && completedBatch.length > 0;

    if (allDone && !hasPromptedRef.current) {
      hasPromptedRef.current = true;
      setCompletedScans(completedBatch.slice(-3));
      const timer = setTimeout(() => {
        setIsVisible(true);
        clearCompletedBatch();
      }, POST_UPLOAD_PROMPT_DELAY_MS);

      return () => clearTimeout(timer);
    }

    return;
  }, [clearCompletedBatch, completedBatch, pendingUploadCount, totalCompleted]);

  const dismissPrompt = useCallback((): void => {
    setIsVisible(false);
  }, []);

  return {isVisible, completedScans, dismissPrompt};
}
