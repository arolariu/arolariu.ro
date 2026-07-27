"use client";

/**
 * @fileoverview Preview grid for pending scan uploads.
 * @module app/domains/invoices/upload-scans/_components/UploadPreview
 *
 * @remarks
 * Uses the shared pagination + mobile-detection hooks and a status descriptor map
 * instead of bespoke state and repeated status ternaries.
 */

import {usePaginationWithSearch} from "@/hooks/usePagination";
import {formatFileSize} from "@/lib/utils.generic";
import {Badge, Button, useIsMobile} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect, useState} from "react";
import {TbCheck, TbChevronLeft, TbChevronRight, TbLoader2, TbRotate, TbRotateClockwise, TbTrash, TbX} from "react-icons/tb";
import ScanCard from "../../_cards/ScanCard";
import {StaggerContainer, StaggerItem} from "../../_components/StaggerContainer";
import {useScanUpload} from "../_context/ScanUploadContext";
import type {PendingUpload} from "../_types";
import {describeUploadStatus, type UploadStatusDescriptor} from "./statusDescriptors";
import styles from "./UploadPreview.module.scss";

/** Number of scans to display per page on mobile devices. */
const MOBILE_PAGE_SIZE = 7;

/** Number of scans to display per page on desktop devices. */
const DESKTOP_PAGE_SIZE = 50;

/**
 * Preview component for pending scan uploads.
 * Paginates uploads (7 on mobile, 50 on desktop) and renders status via descriptors.
 */
export default function UploadPreview(): React.JSX.Element | null {
  const t = useTranslations();
  const {pendingUploads, removeFiles, renameFile, rotateFile} = useScanUpload();
  const isMobile = useIsMobile();
  const [editingUploadId, setEditingUploadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const {paginatedItems, currentPage, setCurrentPage, totalPages, setPageSize} = usePaginationWithSearch<PendingUpload>({
    items: pendingUploads,
    initialPageSize: isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE,
  });

  useEffect(() => {
    setPageSize(isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE);
  }, [isMobile, setPageSize]);

  const statusBadgeLabels: Record<UploadStatusDescriptor["badgeStatusKey"], string> = {
    pending: t((m) => m.pages.invoices.uploadScans.preview.status.pending),
    uploading: t((m) => m.pages.invoices.uploadScans.preview.status.uploading),
    retrying: t((m) => m.pages.invoices.uploadScans.preview.status.retrying),
    completed: t((m) => m.pages.invoices.uploadScans.preview.status.completed),
    failed: t((m) => m.pages.invoices.uploadScans.preview.status.failed),
  };

  const overlayNodes: Record<"spinner" | "success" | "error", React.ReactNode> = {
    spinner: <TbLoader2 aria-label={t((m) => m.pages.invoices.uploadScans.preview.status.uploading)} />,
    success: <TbCheck aria-label={t((m) => m.pages.invoices.uploadScans.preview.status.completed)} />,
    error: <TbX aria-label={t((m) => m.pages.invoices.uploadScans.preview.status.failed)} />,
  };

  /** Starts rename mode for an upload. */
  const startRename = useCallback((upload: PendingUpload): void => {
    setEditingUploadId(upload.id);
    setRenameValue(upload.name);
  }, []);

  /** Cancels rename mode and resets draft. */
  const cancelRename = useCallback((upload: PendingUpload): void => {
    setEditingUploadId(null);
    setRenameValue(upload.name);
  }, []);

  /** Commits rename if changed, then exits rename mode. */
  const commitRename = useCallback(
    (upload: PendingUpload): void => {
      const trimmedValue = renameValue.trim();
      if (trimmedValue && trimmedValue !== upload.name) {
        renameFile(upload.id, trimmedValue);
      }
      setEditingUploadId(null);
    },
    [renameFile, renameValue],
  );

  /** Moves pagination to the previous page. */
  const handlePreviousPage = useCallback((): void => {
    setCurrentPage(currentPage - 1);
  }, [currentPage, setCurrentPage]);

  /** Moves pagination to the next page. */
  const handleNextPage = useCallback((): void => {
    setCurrentPage(currentPage + 1);
  }, [currentPage, setCurrentPage]);

  if (pendingUploads.length === 0) {
    return null;
  }

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <h2 className={styles["title"]}>{t((m) => m.pages.invoices.uploadScans.preview.title, {count: String(pendingUploads.length)})}</h2>
      </div>

      <StaggerContainer
        className={styles["grid"]}
        staggerDelay={0.05}>
        {paginatedItems.map((upload) => {
          const descriptor = describeUploadStatus(upload.status);
          const isPdf = upload.mimeType === "application/pdf";
          const isEditing = editingUploadId === upload.id;

          return (
            <StaggerItem key={upload.id}>
              <ScanCard
                media={{src: upload.preview || upload.blobUrl || "", mediaKind: isPdf ? "pdf" : "image", alt: upload.name}}
                title={upload.name}
                metadataItems={[formatFileSize(upload.size)]}
                isLocked={descriptor.isLocked}
                rename={{
                  value: isEditing ? renameValue : upload.name,
                  isEditing,
                  onStart: () => {
                    startRename(upload);
                  },
                  onChange: setRenameValue,
                  onCommit: () => {
                    commitRename(upload);
                  },
                  onCancel: () => {
                    cancelRename(upload);
                  },
                  placeholder: t((m) => m.pages.invoices.viewScans.scanCard.renamePlaceholder),
                }}
                statusBadge={<Badge variant='secondary'>{statusBadgeLabels[descriptor.badgeStatusKey]}</Badge>}
                progress={descriptor.showProgress ? {value: upload.progress, label: `${upload.progress}%`} : undefined}
                error={
                  upload.status === "retrying"
                    ? t((m) => m.pages.invoices.uploadScans.preview.retryAttempt, {attempt: String(upload.attempts)})
                    : upload.error
                }
                actions={[
                  {
                    key: "rotate-cw",
                    label: t((m) => m.pages.invoices.viewScans.scanCard.actions.rotateCW),
                    icon: <TbRotateClockwise />,
                    onSelect: () => void rotateFile(upload.id, "cw"),
                    disabled: isPdf,
                  },
                  {
                    key: "rotate-ccw",
                    label: t((m) => m.pages.invoices.viewScans.scanCard.actions.rotateCCW),
                    icon: <TbRotate />,
                    onSelect: () => void rotateFile(upload.id, "ccw"),
                    disabled: isPdf,
                  },
                  {
                    key: "remove",
                    label: t((m) => m.pages.invoices.uploadScans.preview.removeTooltip),
                    icon: <TbTrash />,
                    onSelect: () => {
                      removeFiles([upload.id]);
                    },
                    destructive: true,
                  },
                ]}
                centerOverlay={descriptor.overlay ? overlayNodes[descriptor.overlay] : undefined}
              />
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {totalPages > 1 && (
        <div className={styles["pagination"]}>
          <Button
            variant='outline'
            size='sm'
            onClick={handlePreviousPage}
            disabled={currentPage === 1}>
            <TbChevronLeft />
            {t((m) => m.pages.invoices.uploadScans.preview.pagination.previous)}
          </Button>
          <span className={styles["paginationInfo"]}>
            {t((m) => m.pages.invoices.uploadScans.preview.pagination.pageInfo, {
              current: String(currentPage),
              total: String(totalPages),
              count: String(pendingUploads.length),
            })}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}>
            {t((m) => m.pages.invoices.uploadScans.preview.pagination.next)}
            <TbChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
