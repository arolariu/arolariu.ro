"use client";

/**
 * @fileoverview Wires post-upload prompt timing + navigation to the prompt dialog.
 * @module app/domains/invoices/upload-scans/_components/UploadPromptContainer
 */

import {useRouter} from "next/navigation";
import {useCallback} from "react";
import {useScanUpload} from "../_context/ScanUploadContext";
import {usePostUploadPrompt} from "../_hooks/usePostUploadPrompt";
import PostUploadPrompt from "./PostUploadPrompt";

/** Connects the prompt timing hook and navigation handlers to the dialog. */
export default function UploadPromptContainer(): React.JSX.Element {
  const router = useRouter();
  const {pendingUploads, sessionStats, completedBatch, clearCompletedBatch} = useScanUpload();
  const {isVisible, completedScans, dismissPrompt} = usePostUploadPrompt({
    pendingUploadCount: pendingUploads.length,
    totalCompleted: sessionStats.totalCompleted,
    completedBatch,
    clearCompletedBatch,
  });

  const handleCreateInvoice = useCallback((): void => {
    dismissPrompt();
    router.push("/domains/invoices/create-invoice");
  }, [dismissPrompt, router]);

  const handleViewScans = useCallback((): void => {
    dismissPrompt();
    router.push("/domains/invoices/view-scans");
  }, [dismissPrompt, router]);

  return (
    <PostUploadPrompt
      completedScans={completedScans}
      onCreateInvoice={handleCreateInvoice}
      onViewScans={handleViewScans}
      onDismiss={dismissPrompt}
      isVisible={isVisible}
    />
  );
}
