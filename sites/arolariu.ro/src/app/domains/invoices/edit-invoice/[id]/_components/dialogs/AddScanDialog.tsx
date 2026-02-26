"use client";

import {attachInvoiceScan} from "@/lib/actions/invoices/attachInvoiceScan";
import {createInvoiceScan} from "@/lib/actions/invoices/createInvoiceScan";
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
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {useDropzone} from "react-dropzone";
import {TbCloudUpload, TbFile, TbLoader2, TbUpload, TbX} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./AddScanDialog.module.scss";

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
 * @see {@link createInvoiceScan} - Uploads file to Azure Blob Storage
 * @see {@link attachInvoiceScan} - Attaches scan URL to invoice
 */
export default function AddScanDialog(): React.JSX.Element {
  const t = useTranslations("Domains.services.invoices.ui.addScanDialog");
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("EDIT_INVOICE__SCAN", "add");

  const invoice = payload as Invoice | null;

  const [file, setFile] = useState<File | null>(null);
  const [scanType, setScanType] = useState<InvoiceScanType>(InvoiceScanType.JPEG);
  const [isUploading, setIsUploading] = useState(false);

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
        toast.error(t("toasts.fileTooLargeTitle"), {
          description: t("toasts.fileTooLargeDescription"),
        });
        return;
      }

      setScanType(detectScanType(selectedFile.name));
      setFile(selectedFile);
    },
    [detectScanType],
  );

  const {getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject} = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const removeFile = useCallback(() => {
    setFile(null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file || !invoice) return;

    setIsUploading(true);
    try {
      // Step 1: Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(reader.result as string));
        reader.addEventListener("error", () => reject(reader.error));
        reader.readAsDataURL(file);
      });

      // Step 2: Generate unique blob name
      const extension = file.name.split(".").pop() || "jpg";
      const blobName = `${invoice.userIdentifier}/${invoice.id}/${crypto.randomUUID()}.${extension}`;

      // Step 3: Upload to Azure Blob Storage
      const {status, blobUrl} = await createInvoiceScan({
        base64Data,
        blobName,
        metadata: {
          invoiceId: invoice.id,
          uploadedAt: new Date().toISOString(),
        },
      });

      if (status !== 201) {
        throw new Error(t("errors.uploadStorageFailed"));
      }

      // Step 4: Attach scan to invoice
      await attachInvoiceScan({
        invoiceId: invoice.id,
        payload: {
          type: scanType,
          location: blobUrl,
          additionalMetadata: {
            originalFileName: file.name,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      toast.success(t("toasts.scanAddedTitle"), {
        description: t("toasts.scanAddedDescription"),
      });

      // Reset state and close dialog
      setFile(null);
      close();

      // Refresh the page to show new scan
      router.refresh();
    } catch (error) {
      console.error(t("console.uploadError"), error);
      toast.error(t("toasts.scanFailedTitle"), {
        description: error instanceof Error ? error.message : t("errors.unknown"),
      });
    } finally {
      setIsUploading(false);
    }
  }, [file, invoice, scanType, close, router]);

  const handleClose = useCallback(() => {
    setFile(null);
    close();
  }, [close]);

  const handleScanTypeChange = useCallback((value: string) => {
    setScanType(Number(value) as InvoiceScanType);
  }, []);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- simple dialog open/close handler
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : handleClose())}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {/* eslint-disable react/jsx-props-no-spreading, react/jsx-handler-names -- react-dropzone library requires spread props */}
        <div className={styles["body"]}>
          {/* Dropzone - using react-dropzone library pattern with spread props */}
          <div
            {...getRootProps()}
            className={
              isUploading
                ? styles["dropzoneDisabled"]
                : isDragReject
                  ? styles["dropzoneDragReject"]
                  : isDragAccept
                    ? styles["dropzoneDragAccept"]
                    : isDragActive
                      ? styles["dropzoneDragActive"]
                      : styles["dropzoneIdle"]
            }>
            <input {...getInputProps()} />
            <TbCloudUpload className={styles["uploadIcon"]} />
            {isDragActive ? (
              <p className={styles["dropText"]}>{t("dropzone.dropHere")}</p>
            ) : (
              <>
                <p className={styles["dropText"]}>{t("dropzone.dragAndDrop")}</p>
                <p className={styles["dropSubtext"]}>{t("dropzone.orClickBrowse")}</p>
              </>
            )}
            <p className={styles["dropFormats"]}>{t("dropzone.formats")}</p>
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
                disabled={isUploading}
                className='h-8 w-8 shrink-0'>
                <TbX className='h-4 w-4' />
              </Button>
            </div>
          ) : null}

          {/* Scan type selector */}
          {file ? (
            <div className={styles["scanTypeGrid"]}>
              <Label htmlFor='scan-type'>{t("scanType.label")}</Label>
              <Select
                value={String(scanType)}
                onValueChange={handleScanTypeChange}
                disabled={isUploading}>
                <SelectTrigger id='scan-type'>
                  <SelectValue placeholder={t("scanType.placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(InvoiceScanType.JPEG)}>{t("scanType.jpeg")}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.PNG)}>{t("scanType.png")}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.PDF)}>{t("scanType.pdf")}</SelectItem>
                  <SelectItem value={String(InvoiceScanType.OTHER)}>{t("scanType.other")}</SelectItem>
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
            disabled={isUploading}>
            {t("buttons.cancel")}
          </Button>
          <Button
            type='button'
            onClick={handleUpload}
            disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <TbLoader2 className='mr-2 h-4 w-4 animate-spin' />
                {t("buttons.uploading")}
              </>
            ) : (
              <>
                <TbUpload className='mr-2 h-4 w-4' />
                {t("buttons.upload")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
