"use client";

/**
 * @fileoverview Individual scan card component with selection support (shared).
 * @module app/domains/invoices/_components/ScanCard
 */

import {deleteScan, updateScan} from "@/app/domains/invoices/_actions/scans";
import {formatDate} from "@/lib/utils.generic";
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
import {useTranslations} from "next-intl-selector";
import {useCallback, useEffect, useRef, useState} from "react";
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

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(scan.name);
  const [showPreview, setShowPreview] = useState(false);
  const [justRenamed, setJustRenamed] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const removeScan = useScansStore((state) => state.removeScan);
  const updateScanName = useScansStore((state) => state.updateScanName);
  const updateScanBlobUrl = useScansStore((state) => state.updateScanBlobUrl);

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
        toast.success(t((m) => m["IMS--ViewScans"].scanCard.deleteDialog.success));
      } else {
        toast.error(result.error.message || t((m) => m["IMS--ViewScans"].scanCard.deleteDialog.error));
      }
    } catch (error) {
      toast.error(t((m) => m["IMS--ViewScans"].scanCard.deleteDialog.error));
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

  const handleSaveRename = useCallback(
    (event?: React.SyntheticEvent): void => {
      event?.preventDefault();
      const trimmedName = newName.trim();
      if (trimmedName && trimmedName !== scan.name) {
        updateScanName(scan.id, trimmedName);
        toast.success(t((m) => m["IMS--ViewScans"].scanCard.rename));
        setJustRenamed(true);
        setTimeout(() => setJustRenamed(false), 300);
      }
      setIsRenaming(false);
    },
    [newName, scan.id, scan.name, updateScanName, t],
  );

  const handleCancelRename = useCallback(
    (event?: React.SyntheticEvent): void => {
      event?.preventDefault();
      setIsRenaming(false);
      setNewName(scan.name);
    },
    [scan.name],
  );

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

  const handleRotate = useCallback(
    async (degrees: number): Promise<void> => {
      if (!scan.blobUrl || scan.mimeType === "application/pdf") {
        toast.error(t((m) => m["IMS--ViewScans"].scanCard.actions.rotateUnsupported));
        return;
      }

      setIsRotating(true);
      try {
        // 1. Fetch image data directly (avoids CORS)
        const response = await fetch(scan.blobUrl);
        const imageBlob = await response.blob();
        const objectUrl = URL.createObjectURL(imageBlob);

        const img = new globalThis.Image();
        await new Promise<void>((resolve, reject) => {
          img.addEventListener("load", () => resolve(), {once: true});
          img.addEventListener("error", () => reject(new Error("Failed to load image")), {once: true});
          img.src = objectUrl;
        });

        // 2. Create rotated canvas
        const canvas = document.createElement("canvas");
        const isRightAngle = Math.abs(degrees) === 90 || Math.abs(degrees) === 270;
        canvas.width = isRightAngle ? img.height : img.width;
        canvas.height = isRightAngle ? img.width : img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Failed to get canvas context");
        }

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((degrees * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // 3. Convert to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error("Failed to create blob"));
            },
            "image/jpeg",
            0.92,
          );
        });

        // 4. Convert to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.addEventListener(
            "loadend",
            () => {
              const result = reader.result as string;
              resolve(result.split(",")[1]!);
            },
            {once: true},
          );
          reader.addEventListener("error", () => reject(new Error("Failed to read blob")), {once: true});
          reader.readAsDataURL(blob);
        });

        // 5. Extract blob name from URL (include scans/ prefix)
        const blobName = scan.blobUrl.split("/").slice(-3).join("/");

        // 6. Upload rotated image
        const result = await updateScan({
          base64Data: base64,
          blobName,
          mimeType: "image/jpeg",
          metadata: {rotated: "true"},
        });

        // 7. Clean up object URL
        URL.revokeObjectURL(objectUrl);

        // 8. Update scan in store (append cache-buster to force browser to re-fetch rotated image)
        if (result.success && result.data.blobUrl) {
          const cacheBustedUrl = `${result.data.blobUrl}?t=${Date.now()}`;
          updateScanBlobUrl(scan.id, cacheBustedUrl);
          toast.success(t((m) => m["IMS--ViewScans"].scanCard.actions.rotateSuccess));
        } else {
          toast.error(result.success ? t((m) => m["IMS--ViewScans"].scanCard.actions.rotateError) : result.error.message || t((m) => m["IMS--ViewScans"].scanCard.actions.rotateError));
        }
      } catch (error) {
        toast.error(t((m) => m["IMS--ViewScans"].scanCard.actions.rotateError));
        console.error("Error rotating scan:", error);
      } finally {
        setIsRotating(false);
      }
    },
    [scan.blobUrl, scan.id, scan.mimeType, t, updateScanBlobUrl],
  );

  /** Rotates the scan image 90 degrees clockwise. */
  const handleRotate90 = useCallback(() => handleRotate(90), [handleRotate]);
  /** Rotates the scan image 90 degrees counterclockwise. */
  const handleRotateMinus90 = useCallback(() => handleRotate(-90), [handleRotate]);

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
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    setNewName(e.target.value);
  }, []);

  // Guard against incomplete scan data
  if (!scan.blobUrl && !scan.name) {
    return (
      <Card className={styles["card"]}>
        <CardContent className={styles["cardContentFlush"]}>
          <div className={styles["previewArea"]}>
            <div className={styles["pdfPlaceholder"]}>{/* Empty placeholder */}</div>
          </div>
          <div className={styles["fileInfo"]}>
            <div className={styles["fileName"]}>{t((m) => m["IMS--ViewScans"].scanCard.loading)}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                  <DropdownMenuItem onClick={handleStartRename}>
                    <TbPencil className={styles["trashIcon"]} />
                    {t((m) => m["IMS--ViewScans"].scanCard.actions.rename)}
                  </DropdownMenuItem>
                  {scan.mimeType !== "application/pdf" && (
                    <>
                      <DropdownMenuItem
                        onClick={handleRotate90}
                        disabled={isRotating}>
                        <TbRotateClockwise className={styles["trashIcon"]} />
                        {t((m) => m["IMS--ViewScans"].scanCard.actions.rotateCW)}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleRotateMinus90}
                        disabled={isRotating}>
                        <TbRotate className={styles["trashIcon"]} />
                        {t((m) => m["IMS--ViewScans"].scanCard.actions.rotateCCW)}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    className={styles["deleteMenuItem"]}
                    onClick={handleOpenDeleteDialog}>
                    <TbTrash className={styles["trashIcon"]} />
                    {t((m) => m["IMS--ViewScans"].scanCard.actions.delete)}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Used by invoice badge */}
            {isUsedByInvoice ? (
              <div className={styles["linkedBadgePosition"]}>
                <div className={styles["linkedBadge"]}>
                  <TbLink className={styles["linkedIcon"]} />
                  {t((m) => m["IMS--ViewScans"].scanCard.linked)}
                </div>
              </div>
            ) : null}

            {/* Rotating overlay */}
            {isRotating ? (
              <div className={styles["rotatingOverlay"]}>
                <div className={styles["rotatingSpinner"]} />
                <span className={styles["rotatingText"]}>{t((m) => m["IMS--ViewScans"].scanCard.actions.rotating)}</span>
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
                  onChange={handleNameChange}
                  onKeyDown={handleRenameKeyDown}
                  onBlur={handleCancelRename}
                  placeholder={t((m) => m["IMS--ViewScans"].scanCard.renamePlaceholder)}
                  className={styles["renameInput"]}
                />
                <div className={styles["renameActions"]}>
                  <Button
                    size='sm'
                    variant='ghost'
                    onMouseDown={handleSaveRename}
                    className={styles["renameSaveButton"]}>
                    <TbCheck className={styles["renameIcon"]} />
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    onMouseDown={handleCancelRename}
                    className={styles["renameCancelButton"]}>
                    <TbX className={styles["renameIcon"]} />
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div
                className={styles["fileNameContainer"]}
                role='presentation'
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
              <span>{formatDate(scan.uploadedAt, {locale: "en-US", month: "short", day: "numeric", year: "numeric"})}</span>
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
            <DialogTitle>{t((m) => m["IMS--ViewScans"].scanCard.previewTitle)}</DialogTitle>
          </DialogHeader>
          {scan.mimeType === "application/pdf" ? (
            <div className={styles["pdfPreviewContainer"]}>
              {/* eslint-disable-next-line react/iframe-missing-sandbox -- browser-native PDF viewers don't render reliably inside a sandboxed iframe; tradeoff documented per PR #789 review */}
              <iframe
                src={scan.blobUrl}
                className={styles["pdfPreview"]}
                title={scan.name}
              />
            </div>
          ) : (
            <div className={styles["previewImageContainer"]}>
              {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> chosen over next/image; see spec 2026-05-21-view-scans-deferred-mount-design.md */}
              <img
                src={scan.blobUrl}
                alt={scan.name}
                className={styles["previewImage"]}
                decoding='async'
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
            <AlertDialogTitle>{t((m) => m["IMS--ViewScans"].scanCard.deleteDialog.title)}</AlertDialogTitle>
            <AlertDialogDescription>
              {isUsedByInvoice ? (
                <>
                  <span className={styles["linkedWarning"]}>{t((m) => m["IMS--ViewScans"].scanCard.deleteDialog.linkedWarning)}</span>
                  {t((m) => m["IMS--ViewScans"].scanCard.deleteDialog.linkedDescription)}
                </>
              ) : (
                <>{t((m) => m["IMS--ViewScans"].scanCard.deleteDialog.description, {name: scan.name})}</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t((m) => m["IMS--ViewScans"].scanCard.deleteDialog.cancel)}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className={styles["deleteButton"]}>
              {isDeleting ? t((m) => m["IMS--ViewScans"].scanCard.deleteDialog.deleting) : t((m) => m["IMS--ViewScans"].scanCard.deleteDialog.delete)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
