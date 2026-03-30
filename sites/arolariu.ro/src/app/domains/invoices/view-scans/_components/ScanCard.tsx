"use client";

/**
 * @fileoverview Individual scan card component with selection support.
 * @module app/domains/invoices/view-scans/_components/ScanCard
 */

import {deleteScan} from "@/lib/actions/scans";
import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  toast,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {useCallback, useEffect, useRef, useState} from "react";
import {TbCheck, TbDotsVertical, TbFileTypePdf, TbLink, TbMaximize, TbPencil, TbTrash, TbX} from "react-icons/tb";
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
 * Formats a date as a short date string.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Individual scan card with selection checkbox, inline rename, and preview.
 */
export default function ScanCard({scan, isSelected, onToggleSelect}: Readonly<ScanCardProps>): React.JSX.Element {
  const t = useTranslations("Invoices.ViewScans.scanCard");

  // Guard against incomplete scan data
  if (!scan.blobUrl && !scan.name) {
    return (
      <Card className={styles["card"]}>
        <CardContent className={styles["cardContentFlush"]}>
          <div className={styles["previewArea"]}>
            <div className={styles["pdfPlaceholder"]}>{/* Empty placeholder */}</div>
          </div>
          <div className={styles["fileInfo"]}>
            <div className={styles["fileName"]}>{t("loading")}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(scan.name);
  const [showPreview, setShowPreview] = useState(false);
  const [justRenamed, setJustRenamed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const removeScan = useScansStore((state) => state.removeScan);
  const updateScanName = useScansStore((state) => state.updateScanName);

  const isUsedByInvoice = scan.metadata?.["usedByInvoice"] === "true";

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleDelete = useCallback(async (): Promise<void> => {
    setIsDeleting(true);
    try {
      const result = await deleteScan({blobUrl: scan.blobUrl});
      if (result.success) {
        removeScan(scan.id);
        toast.success(t("deleteDialog.success"));
      } else {
        toast.error(result.error ?? t("deleteDialog.error"));
      }
    } catch (error) {
      toast.error(t("deleteDialog.error"));
      console.error("Error deleting scan:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [scan.blobUrl, scan.id, removeScan, t]);

  const handleOpenDeleteDialog = useCallback((): void => {
    setShowDeleteDialog(true);
  }, []);

  const handleStartRename = useCallback((): void => {
    setIsRenaming(true);
    setNewName(scan.name);
  }, [scan.name]);

  const handleSaveRename = useCallback((): void => {
    const trimmedName = newName.trim();
    if (trimmedName && trimmedName !== scan.name) {
      updateScanName(scan.id, trimmedName);
      toast.success(t("rename"));
      setJustRenamed(true);
      setTimeout(() => setJustRenamed(false), 300);
    }
    setIsRenaming(false);
  }, [newName, scan.id, scan.name, updateScanName, t]);

  const handleCancelRename = useCallback((): void => {
    setIsRenaming(false);
    setNewName(scan.name);
  }, [scan.name]);

  const handleRenameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        handleSaveRename();
      } else if (event.key === "Escape") {
        handleCancelRename();
      }
    },
    [handleSaveRename, handleCancelRename],
  );

  const handleOpenPreview = useCallback((): void => {
    setShowPreview(true);
  }, []);

  return (
    <>
      <Card className={`${styles["card"]} ${isSelected ? styles["cardSelected"] : ""}`}>
        <CardContent className={styles["cardContentFlush"]}>
          {/* Preview */}
          <div
            className={styles["previewArea"]}
            onClick={handleOpenPreview}
            role='button'
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpenPreview();
              }
            }}>
            {scan.mimeType === "application/pdf" ? (
              <div className={styles["pdfPlaceholder"]}>
                <TbFileTypePdf className={styles["pdfIcon"]} />
              </div>
            ) : (
              <>
                <Image
                  src={scan.blobUrl}
                  alt={scan.name}
                  fill
                  className={styles["imagePreview"]}
                  unoptimized
                />
                {/* Preview overlay icon */}
                <div className={styles["previewOverlay"]}>
                  <TbMaximize className={styles["previewIcon"]} />
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
              onClick={(e) => e.stopPropagation()}>
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
              onClick={(e) => e.stopPropagation()}>
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
                  <DropdownMenuItem onClick={handleStartRename}>
                    <TbPencil className={styles["trashIcon"]} />
                    {t("rename")}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={styles["deleteMenuItem"]}
                    onClick={handleOpenDeleteDialog}>
                    <TbTrash className={styles["trashIcon"]} />
                    {t("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Used by invoice badge */}
            {isUsedByInvoice ? (
              <div className={styles["linkedBadgePosition"]}>
                <div className={styles["linkedBadge"]}>
                  <TbLink className={styles["linkedIcon"]} />
                  {t("linked")}
                </div>
              </div>
            ) : null}
          </div>

          {/* File info */}
          <div className={styles["fileInfo"]}>
            {isRenaming ? (
              <motion.div
                initial={{opacity: 0, y: -5}}
                animate={{opacity: 1, y: 0}}
                className={styles["renameContainer"]}>
                <Input
                  ref={inputRef}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={handleCancelRename}
                  placeholder={t("renamePlaceholder")}
                  className={styles["renameInput"]}
                />
                <div className={styles["renameActions"]}>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={handleSaveRename}
                    className={styles["renameSaveButton"]}>
                    <TbCheck className={styles["renameIcon"]} />
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    onClick={handleCancelRename}
                    className={styles["renameCancelButton"]}>
                    <TbX className={styles["renameIcon"]} />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div
                className={styles["fileNameContainer"]}
                onDoubleClick={handleStartRename}>
                <motion.p
                  className={styles["fileName"]}
                  title={scan.name}
                  animate={justRenamed ? {scale: [1, 1.05, 1]} : {}}
                  transition={{duration: 0.3}}>
                  {scan.name}
                </motion.p>
                <Button
                  size='sm'
                  variant='ghost'
                  onClick={handleStartRename}
                  className={styles["editButton"]}>
                  <TbPencil className={styles["editIcon"]} />
                </Button>
              </div>
            )}
            <div className={styles["fileMeta"]}>
              <span>{formatFileSize(scan.sizeInBytes)}</span>
              <span>{formatDate(scan.uploadedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onOpenChange={setShowPreview}>
        <DialogContent className={styles["previewDialog"]}>
          <DialogHeader>
            <DialogTitle>{t("previewTitle")}</DialogTitle>
          </DialogHeader>
          {scan.mimeType === "application/pdf" ? (
            <div className={styles["pdfPreviewContainer"]}>
              <iframe
                src={scan.blobUrl}
                className={styles["pdfPreview"]}
                title={scan.name}
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          ) : (
            <div className={styles["previewImageContainer"]}>
              <Image
                src={scan.blobUrl}
                alt={scan.name}
                fill
                className={styles["previewImage"]}
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {isUsedByInvoice ? (
                <>
                  <span className={styles["linkedWarning"]}>{t("deleteDialog.linkedWarning")}</span>
                  {t("deleteDialog.linkedDescription")}
                </>
              ) : (
                <>{t("deleteDialog.description", {name: scan.name})}</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("deleteDialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className={styles["deleteButton"]}>
              {isDeleting ? t("deleteDialog.deleting") : t("deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
