"use client";

/**
 * @fileoverview Preview component for pending scan uploads.
 * @module app/domains/invoices/upload-scans/_components/UploadPreview
 *
 * @remarks
 * Displays a grid of pending uploads with status indicators.
 */

import {formatFileSize} from "@/lib/utils.generic";
import {Badge, Button} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect, useState} from "react";
import {TbCheck, TbChevronLeft, TbChevronRight, TbLoader2, TbRotate, TbRotateClockwise, TbTrash, TbX} from "react-icons/tb";
import ScanCard from "../../_cards/ScanCard";
import {StaggerContainer, StaggerItem} from "../../_components/StaggerContainer";
import {useScanUpload} from "../_context/ScanUploadContext";
import type {PendingUpload} from "../_utils/uploadTypes";
import styles from "./UploadPreview.module.scss";

/** Number of scans to display per page on mobile devices */
const MOBILE_PAGE_SIZE = 7;

/** Number of scans to display per page on desktop devices */
const DESKTOP_PAGE_SIZE = 50;

/**
 * Preview component for pending scan uploads.
 * Displays a grid of files with status indicators.
 * Paginates uploads with different page sizes for mobile (7) and desktop (50).
 */
export default function UploadPreview(): React.JSX.Element | null {
  const t = useTranslations();
  const {pendingUploads, removeFiles, renameFile, rotateFile} = useScanUpload();
  const [page, setPage] = useState(0);
  const [editingUploadId, setEditingUploadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Detect mobile viewport
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Calculate pagination
  const pageSize = isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
  const totalPages = Math.ceil(pendingUploads.length / pageSize);
  const currentPageUploads = pendingUploads.slice(page * pageSize, (page + 1) * pageSize);

  // Adjust page if current page becomes empty after removal
  useEffect(() => {
    if (page > 0 && currentPageUploads.length === 0 && pendingUploads.length > 0) {
      setPage((p) => Math.max(0, p - 1));
    }
  }, [page, currentPageUploads.length, pendingUploads.length]);

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

  /** Navigates to the previous page of uploads. */
  const handlePreviousPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  /** Navigates to the next page of uploads. */
  const handleNextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

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
        {currentPageUploads.map((upload) => {
          const isLocked = upload.status === "uploading" || upload.status === "retrying" || upload.status === "completed";
          const isPdf = upload.mimeType === "application/pdf";
          const isEditing = editingUploadId === upload.id;

          return (
            <StaggerItem key={upload.id}>
              <ScanCard
                media={{
                  src: upload.preview || upload.blobUrl || "",
                  mediaKind: isPdf ? "pdf" : "image",
                  alt: upload.name,
                }}
                title={upload.name}
                metadataItems={[formatFileSize(upload.size)]}
                isLocked={isLocked}
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
                statusBadge={
                  upload.status === "idle" ? (
                    <Badge variant='secondary'>{t((m) => m.pages.invoices.uploadScans.preview.status.pending)}</Badge>
                  ) : upload.status === "uploading" ? (
                    <Badge variant='secondary'>{t((m) => m.pages.invoices.uploadScans.preview.status.uploading)}</Badge>
                  ) : upload.status === "retrying" ? (
                    <Badge variant='secondary'>{t((m) => m.pages.invoices.uploadScans.preview.status.retrying)}</Badge>
                  ) : upload.status === "completed" ? (
                    <Badge variant='secondary'>{t((m) => m.pages.invoices.uploadScans.preview.status.completed)}</Badge>
                  ) : (
                    <Badge variant='secondary'>{t((m) => m.pages.invoices.uploadScans.preview.status.failed)}</Badge>
                  )
                }
                progress={
                  upload.status === "uploading" || upload.status === "retrying"
                    ? {value: upload.progress, label: `${upload.progress}%`}
                    : undefined
                }
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
                centerOverlay={
                  upload.status === "uploading" || upload.status === "retrying" ? (
                    <TbLoader2 aria-label='Uploading' />
                  ) : upload.status === "completed" ? (
                    <TbCheck aria-label='Upload completed' />
                  ) : upload.status === "failed" ? (
                    <TbX aria-label='Upload failed' />
                  ) : undefined
                }
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
            disabled={page === 0}>
            <TbChevronLeft />
            {t((m) => m.pages.invoices.uploadScans.preview.pagination.previous)}
          </Button>
          <span className={styles["paginationInfo"]}>
            {t((m) => m.pages.invoices.uploadScans.preview.pagination.pageInfo, {
              current: String(page + 1),
              total: String(totalPages),
              count: String(pendingUploads.length),
            })}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={handleNextPage}
            disabled={page >= totalPages - 1}>
            {t((m) => m.pages.invoices.uploadScans.preview.pagination.next)}
            <TbChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
