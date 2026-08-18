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
import {useCallback, useMemo, useState} from "react";
import {useDropzone} from "react-dropzone";
import {TbCloudUpload, TbFile, TbLoader2, TbUpload, TbX} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {useScanAdd} from "../../../_hooks/scan";
import styles from "./AddScanDialog.module.scss";

function getDropzoneClassName(isAdding: boolean, isDragReject: boolean, isDragAccept: boolean, isDragActive: boolean): string | undefined {
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
 * 1. User selects an image or PDF file (JPG, JPEG, PNG, BMP, TIFF, HEIF, or PDF)
 * 2. File is converted to base64 and uploaded to Azure Blob Storage
 * 3. Blob URL is attached to the invoice via API
 * 4. Page refreshes to show the new scan
 *
 * **File Validation**:
 * - Maximum size: 10MB
 * - Supported formats: JPG, JPEG, PNG, BMP, TIFF, HEIF, PDF
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

  // Maps each scan-type value to its localized label so the Select trigger
  // renders the human-readable label instead of the raw enum number.
  const scanTypeItems = useMemo<Record<string, string>>(
    () => ({
      [String(InvoiceScanType.JPEG)]: t((m) => m.dialogs.invoices.addScanDialog.scanType.jpeg),
      [String(InvoiceScanType.PNG)]: t((m) => m.dialogs.invoices.addScanDialog.scanType.png),
      [String(InvoiceScanType.PDF)]: t((m) => m.dialogs.invoices.addScanDialog.scanType.pdf),
      [String(InvoiceScanType.BMP)]: t((m) => m.dialogs.invoices.addScanDialog.scanType.bmp),
      [String(InvoiceScanType.TIFF)]: t((m) => m.dialogs.invoices.addScanDialog.scanType.tiff),
      [String(InvoiceScanType.HEIF)]: t((m) => m.dialogs.invoices.addScanDialog.scanType.heif),
      [String(InvoiceScanType.OTHER)]: t((m) => m.dialogs.invoices.addScanDialog.scanType.other),
    }),
    [t],
  );

  const detectScanType = useCallback((fileName: string): InvoiceScanType => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    const typeMap: Record<string, InvoiceScanType> = {
      jpg: InvoiceScanType.JPEG,
      jpeg: InvoiceScanType.JPEG,
      png: InvoiceScanType.PNG,
      bmp: InvoiceScanType.BMP,
      tif: InvoiceScanType.TIFF,
      tiff: InvoiceScanType.TIFF,
      heif: InvoiceScanType.HEIF,
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
        toast.error(
          t((m) => m.dialogs.invoices.addScanDialog.toasts.fileTooLargeTitle),
          {
            description: t((m) => m.dialogs.invoices.addScanDialog.toasts.fileTooLargeDescription),
          },
        );
        return;
      }

      setScanType(detectScanType(selectedFile.name));
      setFile(selectedFile);
    },
    [detectScanType, t],
  );

  const {getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject} = useDropzone({
    onDrop,
    onDropRejected: () => {
      toast.error(
        t((m) => m.dialogs.invoices.addScanDialog.scanType.other),
        {
          description: t((m) => m.dialogs.invoices.addScanDialog.dropzone.formats),
        },
      );
    },
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/bmp": [".bmp"],
      "image/tiff": [".tif", ".tiff"],
      "image/heif": [".heif"],
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
          <DialogTitle>{t((m) => m.dialogs.invoices.addScanDialog.title)}</DialogTitle>
          <DialogDescription>{t((m) => m.dialogs.invoices.addScanDialog.description)}</DialogDescription>
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
              <p className={styles["dropText"]}>{t((m) => m.dialogs.invoices.addScanDialog.dropzone.dropHere)}</p>
            ) : (
              <>
                <p className={styles["dropText"]}>{t((m) => m.dialogs.invoices.addScanDialog.dropzone.dragAndDrop)}</p>
                <p className={styles["dropSubtext"]}>{t((m) => m.dialogs.invoices.addScanDialog.dropzone.orClickBrowse)}</p>
              </>
            )}
            <p className={styles["dropFormats"]}>{t((m) => m.dialogs.invoices.addScanDialog.dropzone.formats)}</p>
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
              <Label htmlFor='scan-type'>{t((m) => m.dialogs.invoices.addScanDialog.scanType.label)}</Label>
              <Select
                value={String(scanType)}
                onValueChange={handleScanTypeChange}
                items={scanTypeItems}
                disabled={isAdding}>
                <SelectTrigger id='scan-type'>
                  <SelectValue placeholder={t((m) => m.dialogs.invoices.addScanDialog.scanType.placeholder)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(InvoiceScanType.JPEG)}>{t((m) => m.dialogs.invoices.addScanDialog.scanType.jpeg)}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.PNG)}>{t((m) => m.dialogs.invoices.addScanDialog.scanType.png)}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.PDF)}>{t((m) => m.dialogs.invoices.addScanDialog.scanType.pdf)}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.BMP)}>{t((m) => m.dialogs.invoices.addScanDialog.scanType.bmp)}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.TIFF)}>{t((m) => m.dialogs.invoices.addScanDialog.scanType.tiff)}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.HEIF)}>{t((m) => m.dialogs.invoices.addScanDialog.scanType.heif)}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.OTHER)}>{t((m) => m.dialogs.invoices.addScanDialog.scanType.other)}</SelectItem>
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
            {t((m) => m.dialogs.invoices.addScanDialog.buttons.cancel)}
          </Button>
          <Button
            type='button'
            onClick={handleUpload}
            disabled={!file || isAdding}>
            {isAdding ? (
              <>
                <TbLoader2 className={styles["spinnerIcon"]} />
                {t((m) => m.dialogs.invoices.addScanDialog.buttons.uploading)}
              </>
            ) : (
              <>
                <TbUpload className={styles["uploadButtonIcon"]} />
                {t((m) => m.dialogs.invoices.addScanDialog.buttons.upload)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
