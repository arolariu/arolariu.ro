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
import {useCallback, useRef, useState} from "react";
import {TbUpload} from "react-icons/tb";
import {useScanUpload} from "../_context/ScanUploadContext";

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
   * Handle keyboard interaction for accessibility.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.key === "Enter" || event.key === " ") && !isUploading) {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [isUploading],
  );

  /**
   * Handle drag enter event.
   */
  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
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
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
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
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  /**
   * Handle drop event.
   */
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
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
      <div
        className={`mb-16 rounded-lg border-2 border-dashed p-16 text-center transition-all duration-300 ${
          isDragActive
            ? "scale-105 border-purple-400 bg-purple-50 dark:bg-purple-900/20"
            : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50 dark:border-gray-600 dark:bg-gray-900/50 dark:hover:bg-purple-900/20"
        } cursor-pointer`}
        role='button'
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}>
        <motion.div
          animate={isDragActive ? {scale: 1.05} : {scale: 1}}
          transition={{duration: 0.2}}>
          <motion.div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-r from-blue-500 to-cyan-500'>
            <TbUpload className='h-10 w-10 text-white' />
          </motion.div>
          <h3 className='mb-4 text-2xl font-bold text-gray-900 lg:text-3xl dark:text-white'>Upload your scans</h3>
          <p className='mb-6 text-lg text-gray-600 dark:text-gray-300'>
            {isDragActive ? "Drop your files here..." : "Drag and drop your files here, or click to browse"}
          </p>
          <p className='mb-4 text-sm text-gray-500 dark:text-gray-400'>Supports JPG, PNG, PDF files up to 10MB each</p>
          <p className='mb-8 text-xs text-gray-400 dark:text-gray-500'>
            Scans will be stored for later use. Create invoices from the View Scans page.
          </p>
          <input
            ref={fileInputRef}
            type='file'
            accept={ACCEPTED_EXTENSIONS}
            multiple
            onChange={handleFileChange}
            className='hidden'
            aria-label='Upload files'
          />
          <Button
            type='button'
            className='cursor-pointer bg-linear-to-r from-blue-600 to-cyan-600 px-8 py-3 text-lg text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-cyan-700 hover:shadow-xl'>
            Choose Files
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className='mt-8 flex flex-col gap-4'>
      <div
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-all duration-300 ${
          isDragActive
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 bg-transparent hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-900/20"
        } ${isUploading ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
        role='button'
        tabIndex={isUploading ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}>
        <input
          ref={fileInputRef}
          type='file'
          accept={ACCEPTED_EXTENSIONS}
          multiple
          onChange={handleFileChange}
          className='hidden'
          aria-label='Upload files'
        />
        <div className='flex items-center justify-center gap-4'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800'>
            <TbUpload className='h-6 w-6 text-gray-500 dark:text-gray-400' />
          </div>
          <div className='text-left'>
            <p className='text-base font-medium text-gray-900 dark:text-white'>{isDragActive ? "Drop to add..." : "Add more scans"}</p>
            <p className='text-sm text-gray-500 dark:text-gray-400'>JPG, PNG, PDF up to 10MB</p>
          </div>
        </div>
      </div>

      <div className='flex justify-end gap-4'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                onClick={clearAll}
                className='cursor-pointer'
                type='button'
                disabled={isUploading}>
                Clear all
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove all pending uploads from the queue</TooltipContent>
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
                {isUploading ? "Uploading..." : "Upload scans"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Upload all pending scans to your account</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
