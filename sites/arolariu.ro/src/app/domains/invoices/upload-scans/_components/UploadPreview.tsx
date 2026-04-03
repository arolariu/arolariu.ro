"use client";

/**
 * @fileoverview Preview component for pending scan uploads.
 * @module app/domains/invoices/upload-scans/_components/UploadPreview
 *
 * @remarks
 * Displays a grid of pending uploads with status indicators.
 */

import {Badge, Button, Card, CardContent, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {useCallback, useEffect, useState} from "react";
import {TbCheck, TbChevronLeft, TbChevronRight, TbFileTypePdf, TbLoader2, TbTrash, TbX} from "react-icons/tb";
import {StaggerContainer, StaggerItem} from "../../_components/StaggerContainer";
import {useScanUpload} from "../_context/ScanUploadContext";
import styles from "./UploadPreview.module.scss";

/**
 * Formats file size in human-readable format.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Status of a pending upload
 */
type PendingUploadStatus = "idle" | "uploading" | "retrying" | "completed" | "failed";

/**
 * Represents a file pending upload for the card component
 */
interface PendingUploadCardProps {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  preview: string;
  status: PendingUploadStatus;
  progress: number;
  attempts: number;
  error?: string;
  onRemove: (ids: string[]) => void;
}

/**
 * Individual upload card component to avoid inline function binding.
 */
function UploadCard({
  id,
  name,
  mimeType,
  size,
  preview,
  status,
  progress,
  attempts,
  error,
  onRemove,
}: Readonly<PendingUploadCardProps>): React.JSX.Element {
  const t = useTranslations("IMS--UploadScans");
  const handleRemove = useCallback(() => {
    onRemove([id]);
  }, [onRemove, id]);

  return (
    <Card className={styles["card"]}>
      <CardContent className={styles["cardContentFlush"]}>
        {/* Preview */}
        <div className={styles["previewArea"]}>
          {mimeType === "application/pdf" ? (
            <div className={styles["pdfPlaceholder"]}>
              <TbFileTypePdf className={styles["pdfIcon"]} />
            </div>
          ) : preview ? (
            <Image
              src={preview}
              alt={name}
              fill
              className={styles["imagePreview"]}
              unoptimized
            />
          ) : (
            <div className={styles["pdfPlaceholder"]}>
              <TbFileTypePdf className={styles["pdfIcon"]} />
            </div>
          )}

          {/* Status overlay */}
          {(status === "uploading" || status === "retrying") && (
            <div className={`${styles["statusOverlay"]} ${styles["overlayUploading"]}`}>
              <TbLoader2 className={`${styles["statusIcon"]} ${styles["spinIcon"]}`} />
            </div>
          )}
          {status === "completed" && (
            <div className={`${styles["statusOverlay"]} ${styles["overlayCompleted"]}`}>
              <TbCheck className={styles["statusIcon"]} />
            </div>
          )}
          {status === "failed" && (
            <div className={`${styles["statusOverlay"]} ${styles["overlayFailed"]}`}>
              <TbX className={styles["statusIcon"]} />
            </div>
          )}

          {/* Status badge */}
          <div className={styles["badgePosition"]}>
            {status === "idle" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Badge
                        variant='secondary'
                        className={styles["badgePending"]}>
                        {t("preview.status.pending")}
                      </Badge>
                    }
                  />
                  <TooltipContent side='top'>{t("preview.pendingTooltip")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {status === "uploading" && (
              <Badge
                variant='secondary'
                className={styles["badgeUploading"]}>
                {t("preview.status.uploading")}
              </Badge>
            )}
            {status === "retrying" && (
              <Badge
                variant='secondary'
                className={styles["badgeRetrying"]}>
                {t("preview.status.retrying")}
              </Badge>
            )}
            {status === "completed" && (
              <Badge
                variant='secondary'
                className={styles["badgeCompleted"]}>
                {t("preview.status.completed")}
              </Badge>
            )}
            {status === "failed" && (
              <Badge
                variant='secondary'
                className={styles["badgeFailed"]}>
                {t("preview.status.failed")}
              </Badge>
            )}
          </div>

          {/* Remove button */}
          {(status === "idle" || status === "failed") && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='ghost'
                      size='icon'
                      className={styles["removeButton"]}
                      onClick={handleRemove}>
                      <TbTrash className={styles["removeIcon"]} />
                    </Button>
                  }
                />
                <TooltipContent side='right'>{t("preview.removeTooltip")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* File info */}
        <div className={styles["fileInfo"]}>
          <p
            className={styles["fileName"]}
            title={name}>
            {name}
          </p>
          <p className={styles["fileSize"]}>{formatFileSize(size)}</p>
          {(status === "uploading" || status === "retrying") && (
            <>
              <div className={styles["progressTrack"]}>
                <div
                  className={styles["progressFill"]}
                  style={{width: `${Math.max(0, Math.min(progress, 100))}%`}}
                />
              </div>
              <p className={styles["fileSize"]}>{progress}%</p>
            </>
          )}
          {status === "retrying" ? <p className={styles["fileError"]}>{t("preview.retryAttempt", {attempt: String(attempts)})}</p> : null}
          {error ? <p className={styles["fileError"]}>{error}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

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
  const t = useTranslations("IMS--UploadScans");
  const {pendingUploads, removeFiles} = useScanUpload();
  const [page, setPage] = useState(0);

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

  if (pendingUploads.length === 0) {
    return null;
  }

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <h2 className={styles["title"]}>{t("preview.title", {count: String(pendingUploads.length)})}</h2>
      </div>

      <StaggerContainer
        className={styles["grid"]}
        staggerDelay={0.05}>
        {currentPageUploads.map((upload) => (
          <StaggerItem key={upload.id}>
            <UploadCard
              id={upload.id}
              name={upload.name}
              mimeType={upload.mimeType}
              size={upload.size}
              preview={upload.preview}
              status={upload.status}
              progress={upload.progress}
              attempts={upload.attempts}
              error={upload.error}
              onRemove={removeFiles}
            />
          </StaggerItem>
        ))}
      </StaggerContainer>

      {totalPages > 1 && (
        <div className={styles["pagination"]}>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}>
            <TbChevronLeft />
            {t("preview.pagination.previous")}
          </Button>
          <span className={styles["paginationInfo"]}>
            {t("preview.pagination.pageInfo", {
              current: String(page + 1),
              total: String(totalPages),
              count: String(pendingUploads.length),
            })}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}>
            {t("preview.pagination.next")}
            <TbChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}
