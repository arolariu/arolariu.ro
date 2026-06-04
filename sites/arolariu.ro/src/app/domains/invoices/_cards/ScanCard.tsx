"use client";

/**
 * @fileoverview Individual scan card component with selection support (shared).
 * @module app/domains/invoices/_cards/ScanCard
 */

import {formatDate} from "@/lib/utils.generic";
import type {CachedScan} from "@/types/scans";
import {ScanStatus} from "@/types/scans";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect} from "react";
import {
  TbCheck,
  TbDotsVertical,
  TbFileTypePdf,
  TbLink,
  TbMaximize,
  TbPencil,
  TbRotate,
  TbRotateClockwise,
  TbTrash,
  TbX,
  TbZoomIn,
} from "react-icons/tb";
import {useDialogs} from "../_contexts/DialogContext";
import {useScanRename, useScanRotation} from "../_hooks/scan";
import styles from "./ScanCard.module.scss";

type ScanCardProps = {
  scan: CachedScan;
  isSelected: boolean;
  onToggleSelect: () => void;
};

/**
 * Formats file size in human-readable format.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Individual scan card with selection checkbox, inline rename, and preview.
 */
export default function ScanCard({scan, isSelected, onToggleSelect}: Readonly<ScanCardProps>): React.JSX.Element {
  const t = useTranslations();
  const {openDialog} = useDialogs();

  const rename = useScanRename(scan);
  const rotation = useScanRotation(scan);

  const isUsedByInvoice = scan.metadata.status === ScanStatus.ATTACHED && Boolean(scan.metadata.attachedTo);

  // Focus input when entering rename mode
  useEffect(() => {
    if (rename.isEditing && rename.inputRef.current) {
      rename.inputRef.current.focus();
      rename.inputRef.current.select();
    }
  }, [rename.isEditing, rename.inputRef]);

  const handleRenameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        rename.commit();
      } else if (event.key === "Escape") {
        rename.cancel();
      }
    },
    [rename],
  );

  const handleOpenPreview = useCallback((): void => {
    openDialog("SHARED__SCAN_PREVIEW", "view", {scan});
  }, [openDialog, scan]);

  const handleOpenDeleteDialog = useCallback((): void => {
    openDialog("SHARED__SCAN_DELETE", "delete", {scan});
  }, [openDialog, scan]);

  /** Opens the preview dialog when Enter or Space is pressed. */
  const handlePreviewKeyDown = useCallback(
    (e: React.KeyboardEvent): void => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleOpenPreview();
      }
    },
    [handleOpenPreview],
  );

  /** Stops event propagation to prevent triggering parent click handlers. */
  const handleStopPropagation = useCallback((e: React.SyntheticEvent): void => {
    e.stopPropagation();
  }, []);

  /** Updates the scan name input field as the user types. */
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      rename.change(e.target.value);
    },
    [rename],
  );

  // Guard against incomplete scan data
  if (!scan.blobUrl && !scan.name) {
    return (
      <Card className={styles["card"]}>
        <CardContent className={styles["cardContentFlush"]}>
          <div className={styles["previewArea"]}>
            <div className={styles["pdfPlaceholder"]}>{/* Empty placeholder */}</div>
          </div>
          <div className={styles["fileInfo"]}>
            <div className={styles["fileName"]}>{t((m) => m.pages.invoices.viewScans.scanCard.loading)}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${styles["card"]} ${isSelected ? styles["cardSelected"] : ""}`}>
      <CardContent className={styles["cardContentFlush"]}>
        {/* Preview */}
        <div
          className={styles["previewArea"]}
          onClick={handleOpenPreview}
          role='button'
          tabIndex={0}
          onKeyDown={handlePreviewKeyDown}>
          {scan.mimeType === "application/pdf" ? (
            <div className={styles["pdfPlaceholder"]}>
              <TbFileTypePdf className={styles["pdfIcon"]} />
            </div>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> chosen over next/image; see spec 2026-05-21-view-scans-deferred-mount-design.md */}
              <img
                src={scan.blobUrl}
                alt={scan.name}
                className={styles["imagePreview"]}
                loading='lazy'
                decoding='async'
              />
              {/* Preview overlay icon for images - use zoom icon */}
              <div className={styles["previewOverlay"]}>
                <TbZoomIn className={styles["previewIcon"]} />
              </div>
            </>
          )}

          {/* Preview overlay for PDFs */}
          {scan.mimeType === "application/pdf" && (
            <div className={styles["previewOverlay"]}>
              <TbMaximize className={styles["previewIcon"]} />
            </div>
          )}

          {/* Selection checkbox */}
          <div
            className={styles["checkboxPosition"]}
            role='presentation'
            onClick={handleStopPropagation}
            onKeyDown={handleStopPropagation}>
            <Checkbox
              checked={isSelected}
              nativeButton
              onCheckedChange={onToggleSelect}
              className={styles["checkbox"]}
            />
          </div>

          {/* Actions menu */}
          <div
            className={styles["actionsPosition"]}
            role='presentation'
            onClick={handleStopPropagation}
            onKeyDown={handleStopPropagation}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant='ghost'
                    size='icon'
                    className={styles["actionsButton"]}>
                    <TbDotsVertical className={styles["menuIcon"]} />
                  </Button>
                }
              />
              <DropdownMenuContent align='end'>
                <DropdownMenuItem onClick={rename.start}>
                  <TbPencil className={styles["trashIcon"]} />
                  {t((m) => m.pages.invoices.viewScans.scanCard.actions.rename)}
                </DropdownMenuItem>
                {scan.mimeType !== "application/pdf" && (
                  <>
                    <DropdownMenuItem
                      onClick={() => rotation.rotateScanCallback("cw")}
                      disabled={rotation.isRotating}>
                      <TbRotateClockwise className={styles["trashIcon"]} />
                      {t((m) => m.pages.invoices.viewScans.scanCard.actions.rotateCW)}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => rotation.rotateScanCallback("ccw")}
                      disabled={rotation.isRotating}>
                      <TbRotate className={styles["trashIcon"]} />
                      {t((m) => m.pages.invoices.viewScans.scanCard.actions.rotateCCW)}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem
                  className={styles["deleteMenuItem"]}
                  onClick={handleOpenDeleteDialog}>
                  <TbTrash className={styles["trashIcon"]} />
                  {t((m) => m.pages.invoices.viewScans.scanCard.actions.delete)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Used by invoice badge */}
          {isUsedByInvoice ? (
            <div className={styles["linkedBadgePosition"]}>
              <div className={styles["linkedBadge"]}>
                <TbLink className={styles["linkedIcon"]} />
                {t((m) => m.pages.invoices.viewScans.scanCard.linked)}
              </div>
            </div>
          ) : null}

          {/* Rotating overlay */}
          {rotation.isRotating ? (
            <div className={styles["rotatingOverlay"]}>
              <div className={styles["rotatingSpinner"]} />
              <span className={styles["rotatingText"]}>{t((m) => m.pages.invoices.viewScans.scanCard.actions.rotating)}</span>
            </div>
          ) : null}
        </div>

        {/* File info */}
        <div className={styles["fileInfo"]}>
          {rename.isEditing ? (
            <motion.div
              initial={{opacity: 0, y: -5}}
              animate={{opacity: 1, y: 0}}
              className={styles["renameContainer"]}>
              <Input
                ref={rename.inputRef}
                value={rename.value}
                onChange={handleNameChange}
                onKeyDown={handleRenameKeyDown}
                onBlur={rename.cancel}
                placeholder={t((m) => m.pages.invoices.viewScans.scanCard.renamePlaceholder)}
                className={styles["renameInput"]}
              />
              <div className={styles["renameActions"]}>
                <Button
                  size='sm'
                  variant='ghost'
                  onMouseDown={() => rename.commit()}
                  className={styles["renameSaveButton"]}>
                  <TbCheck className={styles["renameIcon"]} />
                </Button>
                <Button
                  size='sm'
                  variant='ghost'
                  onMouseDown={rename.cancel}
                  className={styles["renameCancelButton"]}>
                  <TbX className={styles["renameIcon"]} />
                </Button>
              </div>
            </motion.div>
          ) : (
            <div
              className={styles["fileNameContainer"]}
              role='presentation'
              onDoubleClick={rename.start}>
              <motion.p
                className={styles["fileName"]}
                title={scan.name}
                animate={rename.justRenamed ? {scale: [1, 1.05, 1]} : {}}
                transition={{duration: 0.3}}>
                {scan.name}
              </motion.p>
              <Button
                size='sm'
                variant='ghost'
                onClick={rename.start}
                className={styles["editButton"]}>
                <TbPencil className={styles["editIcon"]} />
              </Button>
            </div>
          )}
          <div className={styles["fileMeta"]}>
            <span>{formatFileSize(scan.sizeInBytes)}</span>
            <span>{formatDate(scan.uploadedAt, {locale: "en-US", month: "short", day: "numeric", year: "numeric"})}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
