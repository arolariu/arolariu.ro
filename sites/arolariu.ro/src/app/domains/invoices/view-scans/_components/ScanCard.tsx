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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  toast,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {useCallback, useState} from "react";
import {TbDotsVertical, TbFileTypePdf, TbLink, TbTrash} from "react-icons/tb";
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
 * Individual scan card with selection checkbox.
 */
export default function ScanCard({scan, isSelected, onToggleSelect}: Readonly<ScanCardProps>): React.JSX.Element {
  const t = useTranslations("Invoices.ViewScans.scanCard");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const removeScan = useScansStore((state) => state.removeScan);

  const isUsedByInvoice = scan.metadata?.["usedByInvoice"] === "true";

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

  return (
    <>
      <Card
        className={`overflow-hidden transition-all duration-200 hover:shadow-md ${isSelected ? "ring-2 ring-purple-500 dark:ring-purple-400" : ""}`}>
        <CardContent className='p-0'>
          {/* Preview */}
          <div className={styles["previewArea"]}>
            {scan.mimeType === "application/pdf" ? (
              <div className={styles["pdfPlaceholder"]}>
                <TbFileTypePdf className={styles["pdfIcon"]} />
              </div>
            ) : (
              <Image
                src={scan.blobUrl}
                alt={scan.name}
                fill
                className={styles["imagePreview"]}
                unoptimized
              />
            )}

            {/* Selection checkbox */}
            <div className={styles["checkboxPosition"]}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                className='h-5 w-5 border-2 border-white bg-white/80 data-[state=checked]:bg-purple-500'
              />
            </div>

            {/* Actions menu */}
            <div className={styles["actionsPosition"]}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 rounded-full bg-white/80 text-gray-700 shadow-sm hover:bg-white dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-800'>
                    <TbDotsVertical className={styles["menuIcon"]} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    className='text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-900/20'
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
            <p
              className={styles["fileName"]}
              title={scan.name}>
              {scan.name}
            </p>
            <div className={styles["fileMeta"]}>
              <span>{formatFileSize(scan.sizeInBytes)}</span>
              <span>{formatDate(scan.uploadedAt)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
              className='bg-red-600 text-white hover:bg-red-700'>
              {isDeleting ? t("deleteDialog.deleting") : t("deleteDialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
