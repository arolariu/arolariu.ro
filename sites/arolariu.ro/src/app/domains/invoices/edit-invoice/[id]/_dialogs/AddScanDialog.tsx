"use client";

import {type Invoice, InvoiceScanType} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {useDropzone} from "react-dropzone";
import {TbCloudUpload, TbFile, TbLoader2, TbUpload, TbX} from "react-icons/tb";
import styles from "./AddScanDialog.module.scss";
import { useDialog } from "../../../_contexts/DialogContext";
import { useScanAdd } from "../../../_hooks/scan";

function getDropzoneClassName(
  isAdding: boolean,
  isDragReject: boolean,
  isDragAccept: boolean,
  isDragActive: boolean,
): string | undefined {
  if (isAdding) return styles["dropzoneDisabled"];
  if (isDragReject) return styles["dropzoneDragReject"];
  if (isDragAccept) return styles["dropzoneDragAccept"];
  if (isDragActive) return styles["dropzoneDragActive"];
  return styles["dropzoneIdle"];
}

/**
 * Dialog for adding a new scan to an existing invoice.
 *
 * @remarks
 * **Workflow**:
 * 1. User selects an image file (JPEG, PNG, WebP, HEIC, or PDF)
 * 2. File is converted to base64 and uploaded to Azure Blob Storage
 * 3. Blob URL is attached to the invoice via API
 * 4. Page refreshes to show the new scan
 *
 * **File Validation**:
 * - Maximum size: 10MB
 * - Supported formats: JPEG, PNG, WebP, HEIC, PDF
 *
 * @returns Dialog component for adding invoice scans
 *
 * @see {@link useScanAdd} - Uploads and attaches scan files
 */
export default function AddScanDialog(): React.JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("EDIT_INVOICE__ADD_SCAN", "add");

  const invoice: Invoice | null = payload?.invoice ?? null;

  const [file, setFile] = useState<File | null>(null);
  const [scanType, setScanType] = useState<InvoiceScanType>(InvoiceScanType.JPEG);
  const {isAdding, addScanCallback} = useScanAdd(invoice?.id ?? "");

  const detectScanType = useCallback((fileName: string): InvoiceScanType => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    const typeMap: Record<string, InvoiceScanType> = {
      jpg: InvoiceScanType.JPEG,
      jpeg: InvoiceScanType.JPEG,
      png: InvoiceScanType.PNG,
      pdf: InvoiceScanType.PDF,
    };
    return extension && typeMap[extension] ? typeMap[extension] : InvoiceScanType.OTHER;
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const [selectedFile] = acceptedFiles;
      if (!selectedFile) return;

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast.error(t((m) => m["IMS--Dialogs"].addScanDialog.toasts.fileTooLargeTitle), {
          description: t((m) => m["IMS--Dialogs"].addScanDialog.toasts.fileTooLargeDescription),
        });
        return;
      }

      setScanType(detectScanType(selectedFile.name));
      setFile(selectedFile);
    },
    [detectScanType, t],
  );

  const {getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject} = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: isAdding,
  });

  const removeFile = useCallback(() => {
    setFile(null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file || !invoice) return;

    try {
      await addScanCallback({
        file,
        fileName: file.name,
        userIdentifier: invoice.userIdentifier,
        type: scanType,
      });
      setFile(null);
      close();
      router.refresh();
    } catch {
      // The hook owns upload failure feedback.
    }
  }, [file, invoice, scanType, addScanCallback, close, router]);

  const handleClose = useCallback(() => {
    setFile(null);
    close();
  }, [close]);

  const handleScanTypeChange = useCallback((value: string) => {
    setScanType(Number(value) as InvoiceScanType);
  }, []);

  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (shouldOpen) open();
      else handleClose();
    },
    [open, handleClose],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m["IMS--Dialogs"].addScanDialog.title)}</DialogTitle>
          <DialogDescription>{t((m) => m["IMS--Dialogs"].addScanDialog.description)}</DialogDescription>
        </DialogHeader>

        {/* eslint-disable react/jsx-props-no-spreading, react/jsx-handler-names -- react-dropzone library requires spread props */}
        <div className={styles["body"]}>
          {/* Dropzone - using react-dropzone library pattern with spread props */}
          <div
            {...getRootProps()}
            className={getDropzoneClassName(isAdding, isDragReject, isDragAccept, isDragActive)}>
            <input {...getInputProps()} />
            <TbCloudUpload className={styles["uploadIcon"]} />
            {isDragActive ? (
              <p className={styles["dropText"]}>{t((m) => m["IMS--Dialogs"].addScanDialog.dropzone.dropHere)}</p>
            ) : (
              <>
                <p className={styles["dropText"]}>{t((m) => m["IMS--Dialogs"].addScanDialog.dropzone.dragAndDrop)}</p>
                <p className={styles["dropSubtext"]}>{t((m) => m["IMS--Dialogs"].addScanDialog.dropzone.orClickBrowse)}</p>
              </>
            )}
            <p className={styles["dropFormats"]}>{t((m) => m["IMS--Dialogs"].addScanDialog.dropzone.formats)}</p>
          </div>

          {/* Selected file preview */}
          {file ? (
            <div className={styles["filePreview"]}>
              <div className={styles["fileInfo"]}>
                <TbFile className={styles["fileIcon"]} />
                <div className={styles["fileTextWrapper"]}>
                  <p className={styles["fileName"]}>{file.name}</p>
                  <p className={styles["fileSize"]}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={removeFile}
                disabled={isAdding}
                className={styles["removeFileButton"]}>
                <TbX className={styles["icon4"]} />
              </Button>
            </div>
          ) : null}

          {/* Scan type selector */}
          {file ? (
            <div className={styles["scanTypeGrid"]}>
              <Label htmlFor='scan-type'>{t((m) => m["IMS--Dialogs"].addScanDialog.scanType.label)}</Label>
              <Select
                value={String(scanType)}
                onValueChange={handleScanTypeChange}
                disabled={isAdding}>
                <SelectTrigger id='scan-type'>
                  <SelectValue placeholder={t((m) => m["IMS--Dialogs"].addScanDialog.scanType.placeholder)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(InvoiceScanType.JPEG)}>{t((m) => m["IMS--Dialogs"].addScanDialog.scanType.jpeg)}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.PNG)}>{t((m) => m["IMS--Dialogs"].addScanDialog.scanType.png)}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.PDF)}>{t((m) => m["IMS--Dialogs"].addScanDialog.scanType.pdf)}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.OTHER)}>{t((m) => m["IMS--Dialogs"].addScanDialog.scanType.other)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        {/* eslint-enable react/jsx-props-no-spreading, react/jsx-handler-names */}

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={handleClose}
            disabled={isAdding}>
            {t((m) => m["IMS--Dialogs"].addScanDialog.buttons.cancel)}
          </Button>
          <Button
            type='button'
            onClick={handleUpload}
            disabled={!file || isAdding}>
            {isAdding ? (
              <>
                <TbLoader2 className={styles["spinnerIcon"]} />
                {t((m) => m["IMS--Dialogs"].addScanDialog.buttons.uploading)}
              </>
            ) : (
              <>
                <TbUpload className={styles["uploadButtonIcon"]} />
                {t((m) => m["IMS--Dialogs"].addScanDialog.buttons.upload)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
