"use client";

import {attachInvoiceScan} from "@/lib/actions/invoices/attachInvoiceScan";
import {createInvoiceScan} from "@/lib/actions/invoices/createInvoiceScan";
import {InvoiceScanType, type Invoice} from "@/types/invoices";
import {
  Button,
  cn,
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
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {useDropzone} from "react-dropzone";
import {TbCloudUpload, TbFile, TbLoader2, TbUpload, TbX} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";

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
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("EDIT_INVOICE__SCAN_ADD");

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
      const selectedFile = acceptedFiles[0];
      if (!selectedFile) return;

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (selectedFile.size > maxSize) {
        toast.error("File too large", {
          description: "Maximum file size is 10MB",
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
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
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
        throw new Error("Failed to upload scan to storage");
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

      toast.success("Scan added successfully", {
        description: "The scan has been attached to the invoice",
      });

      // Reset state and close dialog
      setFile(null);
      close();

      // Refresh the page to show new scan
      router.refresh();
    } catch (error) {
      console.error("Error uploading scan:", error);
      toast.error("Failed to add scan", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsUploading(false);
    }
  }, [file, invoice, scanType, close, router]);

  const handleClose = useCallback(() => {
    setFile(null);
    close();
  }, [close]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : handleClose())}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Add New Scan</DialogTitle>
          <DialogDescription>Upload a new receipt image or document to attach to this invoice.</DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
              isDragActive && "border-primary bg-primary/5",
              isDragAccept && "border-green-500 bg-green-500/5",
              isDragReject && "border-destructive bg-destructive/5",
              !isDragActive && "hover:border-primary/50 hover:bg-muted/50",
              isUploading && "pointer-events-none opacity-50",
            )}>
            <input {...getInputProps()} />
            <TbCloudUpload className='text-muted-foreground mb-4 h-12 w-12' />
            {isDragActive ? (
              <p className='text-sm font-medium'>Drop the file here...</p>
            ) : (
              <>
                <p className='text-sm font-medium'>Drag & drop a file here</p>
                <p className='text-muted-foreground text-xs'>or click to browse</p>
              </>
            )}
            <p className='text-muted-foreground mt-2 text-xs'>JPEG, PNG, PDF (max 10MB)</p>
          </div>

          {/* Selected file preview */}
          {file && (
            <div className='bg-muted flex items-center justify-between rounded-md p-3'>
              <div className='flex items-center gap-3'>
                <TbFile className='h-8 w-8 shrink-0' />
                <div className='min-w-0'>
                  <p className='truncate text-sm font-medium'>{file.name}</p>
                  <p className='text-muted-foreground text-xs'>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
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
          )}

          {/* Scan type selector */}
          {file && (
            <div className='grid gap-2'>
              <Label htmlFor='scan-type'>Scan Type</Label>
              <Select
                value={String(scanType)}
                onValueChange={(value) => setScanType(Number(value) as InvoiceScanType)}
                disabled={isUploading}>
                <SelectTrigger id='scan-type'>
                  <SelectValue placeholder='Select scan type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={String(InvoiceScanType.JPEG)}>JPEG Image</SelectItem>
                  <SelectItem value={String(InvoiceScanType.PNG)}>PNG Image</SelectItem>
                  <SelectItem value={String(InvoiceScanType.PDF)}>PDF Document</SelectItem>
                  <SelectItem value={String(InvoiceScanType.OTHER)}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={handleClose}
            disabled={isUploading}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={handleUpload}
            disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <TbLoader2 className='mr-2 h-4 w-4 animate-spin' />
                Uploading...
              </>
            ) : (
              <>
                <TbUpload className='mr-2 h-4 w-4' />
                Upload Scan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
