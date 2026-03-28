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
import {useCallback} from "react";
import {TbCheck, TbFileTypePdf, TbLoader2, TbTrash, TbX} from "react-icons/tb";
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
  const t = useTranslations("Invoices.UploadScans");
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
          ) : (
            <Image
              src={preview}
              alt={name}
              fill
              className={styles["imagePreview"]}
              unoptimized
            />
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
              <Badge
                variant='secondary'
                className={styles["badgePending"]}>
                {t("preview.status.pending")}
              </Badge>
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

/**
 * Preview component for pending scan uploads.
 * Displays a grid of files with status indicators.
 */
export default function UploadPreview(): React.JSX.Element | null {
  const t = useTranslations("Invoices.UploadScans");
  const {pendingUploads, removeFiles} = useScanUpload();

  if (pendingUploads.length === 0) {
    return null;
  }

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <h2 className={styles["title"]}>{t("preview.title", {count: String(pendingUploads.length)})}</h2>
      </div>

      <div className={styles["grid"]}>
        {pendingUploads.map((upload) => (
          <UploadCard
            key={upload.id}
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
        ))}
      </div>
    </div>
  );
}
