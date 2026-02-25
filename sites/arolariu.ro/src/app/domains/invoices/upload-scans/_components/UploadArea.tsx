"use client";

/**
 * @fileoverview Upload area component for standalone scan uploads.
 * @module app/domains/invoices/upload-scans/_components/UploadArea
 *
 * @remarks
 * Adapted from the create-invoice UploadArea component.
 * Uploads scans to Azure without creating invoices.
 * Uses native HTML5 drag-and-drop APIs instead of react-dropzone to avoid ESLint issues.
 */

import {Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import {useCallback, useRef, useState} from "react";
import {TbUpload} from "react-icons/tb";
import {useScanUpload} from "../_context/ScanUploadContext";
import styles from "./UploadArea.module.scss";

/** Accepted MIME types for file uploads */
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);

/** Accepted file extensions */
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.pdf";

/** Maximum file size in bytes (10MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Checks if a file is valid based on type and size constraints.
 * @param file - The file to validate
 * @returns True if the file is valid
 */
function isValidFile(file: File): boolean {
  return ACCEPTED_TYPES.has(file.type) && file.size <= MAX_FILE_SIZE;
}

/**
 * Extracts a file from a DataTransferItem.
 * @param item - The DataTransferItem
 * @returns The file if valid, null otherwise
 */
function extractFileFromDataTransferItem(item: DataTransferItem): File | null {
  const file = item.getAsFile();
  if (file && isValidFile(file)) {
    return file;
  }
  return null;
}

/**
 * Filters and validates files from a DataTransferItemList.
 * @param items - The DataTransferItemList to filter
 * @returns An array of valid files
 */
function filterValidFilesFromDataTransfer(items: DataTransferItemList): File[] {
  const validFiles: File[] = [];
  // Convert DataTransferItemList to array for iteration
  const itemsArray = Array.from({length: items.length}, (_, index) => items[index]);

  for (const item of itemsArray) {
    if (item) {
      const file = extractFileFromDataTransferItem(item);
      if (file) {
        validFiles.push(file);
      }
    }
  }

  return validFiles;
}

/**
 * Upload area component for standalone scans.
 * Uses native HTML5 drag-and-drop APIs for file handling.
 */
export default function UploadArea(): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.service.upload-scans");
  const {pendingUploads, isUploading, addFiles, clearAll, uploadAll} = useScanUpload();
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  /**
   * Handle file selection from input element.
   */
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const {files} = event.target;
      if (files && files.length > 0) {
        addFiles(files);
      }
      // Reset input value to allow re-selecting same files
      event.target.value = "";
    },
    [addFiles],
  );

  /**
   * Handle click on the dropzone to trigger file input.
   */
  const handleClick = useCallback(() => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  }, [isUploading]);

  /**
   * Handle drag enter event.
   */
  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current += 1;
      if (event.dataTransfer.items.length > 0 && !isUploading) {
        setIsDragActive(true);
      }
    },
    [isUploading],
  );

  /**
   * Handle drag leave event.
   */
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragActive(false);
    }
  }, []);

  /**
   * Handle drag over event.
   */
  const handleDragOver = useCallback((event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  /**
   * Handle drop event.
   */
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragActive(false);

      if (isUploading) return;

      const droppedFiles = filterValidFilesFromDataTransfer(event.dataTransfer.items);
      if (droppedFiles.length > 0) {
        const dataTransfer = new DataTransfer();
        for (const file of droppedFiles) {
          dataTransfer.items.add(file);
        }
        addFiles(dataTransfer.files);
      }
    },
    [isUploading, addFiles],
  );

  if (pendingUploads.length === 0) {
    return (
      <>
        <input
          ref={fileInputRef}
          type='file'
          accept={ACCEPTED_EXTENSIONS}
          multiple
          onChange={handleFileChange}
          className={styles["hiddenInput"]}
          aria-label={t("uploadArea.aria.uploadFiles")}
        />
        <button
          type='button'
          className={`${styles["dropzoneEmpty"]} ${isDragActive ? styles["dropzoneEmptyActive"] : ""}`}
          onClick={handleClick}
          disabled={isUploading}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}>
          <motion.div
            animate={isDragActive ? {scale: 1.05} : {scale: 1}}
            transition={{duration: 0.2}}>
            <motion.div className={styles["iconCircle"]}>
              <TbUpload className={styles["iconCircleIcon"]} />
            </motion.div>
            <h3 className={styles["dropzoneTitle"]}>{t("uploadArea.empty.title")}</h3>
            <p className={styles["dropzoneSubtitle"]}>
              {isDragActive ? t("uploadArea.empty.dropActive") : t("uploadArea.empty.dropInactive")}
            </p>
            <p className={styles["dropzoneFormats"]}>{t("uploadArea.empty.formats")}</p>
            <p className={styles["dropzoneNote"]}>{t("uploadArea.empty.note")}</p>
            <span className='inline-flex cursor-pointer rounded-md bg-linear-to-r from-blue-600 to-cyan-600 px-8 py-3 text-lg text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-cyan-700 hover:shadow-xl'>
              {t("uploadArea.empty.chooseFiles")}
            </span>
          </motion.div>
        </button>
      </>
    );
  }

  return (
    <div className={styles["wrapper"]}>
      <input
        ref={fileInputRef}
        type='file'
        accept={ACCEPTED_EXTENSIONS}
        multiple
        onChange={handleFileChange}
        className={styles["hiddenInput"]}
        aria-label={t("uploadArea.aria.uploadFiles")}
      />
      <button
        type='button'
        className={`${styles["dropzoneCompact"]} ${isDragActive ? styles["dropzoneCompactActive"] : ""} ${isUploading ? styles["dropzoneCompactDisabled"] : ""}`}
        onClick={handleClick}
        disabled={isUploading}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}>
        <div className={styles["compactContent"]}>
          <div className={styles["compactIconCircle"]}>
            <TbUpload className={styles["compactIcon"]} />
          </div>
          <div className={styles["compactTextBlock"]}>
            <p className={styles["compactTitle"]}>{isDragActive ? t("uploadArea.compact.dropActive") : t("uploadArea.compact.dropInactive")}</p>
            <p className={styles["compactSubtitle"]}>{t("uploadArea.compact.subtitle")}</p>
          </div>
        </div>
      </button>

      <div className={styles["actions"]}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                onClick={clearAll}
                className='cursor-pointer'
                type='button'
                disabled={isUploading}>
                {t("uploadArea.actions.clearAll")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("uploadArea.tooltips.clearAll")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={uploadAll}
                className='cursor-pointer bg-linear-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700'
                type='button'
                disabled={isUploading}>
                {isUploading ? t("uploadArea.actions.uploading") : t("uploadArea.actions.uploadScans")}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t("uploadArea.tooltips.uploadScans")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
