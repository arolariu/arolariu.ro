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
  const t = useTranslations("Domains.services.invoices.service.view-scans.scanCard");
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

  const handleStopPropagation = useCallback((e: React.MouseEvent | React.KeyboardEvent): void => {
    e.stopPropagation();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleOpenDeleteDialog = useCallback((): void => {
    setShowDeleteDialog(true);
  }, []);

  return (
    <>
      <Card
        className={`cursor-pointer overflow-hidden transition-all duration-200 hover:shadow-md ${
          isSelected ? "ring-2 ring-purple-500 dark:ring-purple-400" : ""
        }`}
        onClick={onToggleSelect}>
        <CardContent className='p-0'>
          {/* Preview */}
          <main className={styles["previewArea"]}>
            {scan.mimeType === "application/pdf" ? (
              <main className={styles["pdfPlaceholder"]}>
                <TbFileTypePdf className={styles["pdfIcon"]} />
              </main>
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
            <main
              role='button'
              tabIndex={0}
              className={styles["checkboxPosition"]}
              onClick={handleStopPropagation}
              onKeyDown={handleKeyDown}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                className='h-5 w-5 border-2 border-white bg-white/80 data-[state=checked]:bg-purple-500'
              />
            </main>

            {/* Actions menu */}
            <main
              role='button'
              tabIndex={0}
              className={styles["actionsPosition"]}
              onClick={handleStopPropagation}
              onKeyDown={handleKeyDown}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7 rounded-full bg-white/80 text-gray-700 shadow-sm hover:bg-white dark:bg-gray-800/80 dark:text-gray-300 dark:hover:bg-gray-800'>
                    <TbDotsVertical className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    className='text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-900/20'
                    onClick={handleOpenDeleteDialog}>
                    <TbTrash className='mr-2 h-4 w-4' />
                    {t("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </main>

            {/* Used by invoice badge */}
            {isUsedByInvoice ? (
              <main className={styles["linkedBadgePosition"]}>
                <main className={styles["linkedBadge"]}>
                  <TbLink className={styles["linkedIcon"]} />
                  {t("linked")}
                </main>
              </main>
            ) : null}
          </main>

          {/* File info */}
          <main className={styles["fileInfo"]}>
            <p
              className={styles["fileName"]}
              title={scan.name}>
              {scan.name}
            </p>
            <main className={styles["fileMeta"]}>
              <span>{formatFileSize(scan.sizeInBytes)}</span>
              <span>{formatDate(scan.uploadedAt)}</span>
            </main>
          </main>
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
