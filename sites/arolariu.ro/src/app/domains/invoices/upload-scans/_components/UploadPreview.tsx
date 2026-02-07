"use client";

/**
 * @fileoverview Preview component for pending scan uploads.
 * @module app/domains/invoices/upload-scans/_components/UploadPreview
 *
 * @remarks
 * Displays a grid of pending uploads with status indicators.
 */

import {Badge, Button, Card, CardContent, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
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
type PendingUploadStatus = "idle" | "uploading" | "completed" | "failed";

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
  error?: string;
  onRemove: (ids: string[]) => void;
}

/**
 * Individual upload card component to avoid inline function binding.
 */
function UploadCard({id, name, mimeType, size, preview, status, error, onRemove}: Readonly<PendingUploadCardProps>): React.JSX.Element {
  const handleRemove = useCallback(() => {
    onRemove([id]);
  }, [onRemove, id]);

  return (
    <Card className='relative overflow-hidden'>
      <CardContent className='p-0'>
        {/* Preview */}
        <main className={styles["previewArea"]}>
          {mimeType === "application/pdf" ? (
            <main className={styles["pdfPlaceholder"]}>
              <TbFileTypePdf className={styles["pdfIcon"]} />
            </main>
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
          {status === "uploading" && (
            <main className={`${styles["statusOverlay"]} ${styles["overlayUploading"]}`}>
              <TbLoader2 className={`${styles["statusIcon"]} ${styles["spinIcon"]}`} />
            </main>
          )}
          {status === "completed" && (
            <main className={`${styles["statusOverlay"]} ${styles["overlayCompleted"]}`}>
              <TbCheck className={styles["statusIcon"]} />
            </main>
          )}
          {status === "failed" && (
            <main className={`${styles["statusOverlay"]} ${styles["overlayFailed"]}`}>
              <TbX className={styles["statusIcon"]} />
            </main>
          )}

          {/* Status badge */}
          <main className={styles["badgePosition"]}>
            {status === "idle" && (
              <Badge
                variant='secondary'
                className='bg-gray-500/80 text-white'>
                Pending
              </Badge>
            )}
            {status === "uploading" && (
              <Badge
                variant='secondary'
                className='bg-blue-500/80 text-white'>
                Uploading
              </Badge>
            )}
            {status === "completed" && (
              <Badge
                variant='secondary'
                className='bg-green-500/80 text-white'>
                Done
              </Badge>
            )}
            {status === "failed" && (
              <Badge
                variant='secondary'
                className='bg-red-500/80 text-white'>
                Failed
              </Badge>
            )}
          </main>

          {/* Remove button */}
          {(status === "idle" || status === "failed") && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='absolute top-2 left-2 h-8 w-8 bg-black/50 text-white hover:bg-black/70'
                    onClick={handleRemove}>
                    <TbTrash className={styles["removeIcon"]} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='right'>Remove from queue</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </main>

        {/* File info */}
        <main className={styles["fileInfo"]}>
          <p
            className={styles["fileName"]}
            title={name}>
            {name}
          </p>
          <p className={styles["fileSize"]}>{formatFileSize(size)}</p>
          {error ? <p className={styles["fileError"]}>{error}</p> : null}
        </main>
      </CardContent>
    </Card>
  );
}

/**
 * Preview component for pending scan uploads.
 * Displays a grid of files with status indicators.
 */
export default function UploadPreview(): React.JSX.Element | null {
  const {pendingUploads, removeFiles} = useScanUpload();

  if (pendingUploads.length === 0) {
    return null;
  }

  return (
    <main className={styles["container"]}>
      <main className={styles["header"]}>
        <h2 className={styles["title"]}>Pending Uploads ({pendingUploads.length})</h2>
      </main>

      <main className={styles["grid"]}>
        {pendingUploads.map((upload) => (
          <UploadCard
            key={upload.id}
            id={upload.id}
            name={upload.name}
            mimeType={upload.mimeType}
            size={upload.size}
            preview={upload.preview}
            status={upload.status}
            error={upload.error}
            onRemove={removeFiles}
          />
        ))}
      </main>
    </main>
  );
}
