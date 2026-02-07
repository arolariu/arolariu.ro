"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useCallback, useMemo, useState} from "react";
import {useDropzone, type Accept} from "react-dropzone";
import {TbAlertCircle, TbCheck, TbFile, TbFileSpreadsheet, TbFileText, TbFileTypePdf, TbUpload} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./ImportDialog.module.scss";

/** Supported file format types for invoice import. */
type ImportFileFormat = "csv" | "pdf" | "xlsx";

/** Accepted file types configuration for each tab. */
const ACCEPT_TYPES: Record<ImportFileFormat, Accept> = {
  csv: {"text/csv": [".csv"]},
  pdf: {"application/pdf": [".pdf"]},
  xlsx: {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"]},
};

/**
 * The ImportDialog component allows users to import invoice files in various formats.
 * It includes drag-and-drop functionality using react-dropzone and displays the status of the import process.
 * @returns The ImportDialog component, CSR'ed.
 */
export default function ImportDialog(): React.JSX.Element {
  const [files, setFiles] = useState<File[]>([]);
  const {isOpen, open, close} = useDialog("VIEW_INVOICES__IMPORT");
  const [activeTab, setActiveTab] = useState<ImportFileFormat>("csv");
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFiles((prev) => [...prev, ...acceptedFiles]);
      setUploadStatus("idle");
    }
  }, []);

  const acceptConfig = useMemo(() => ACCEPT_TYPES[activeTab], [activeTab]);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: acceptConfig,
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleImport = useCallback(() => {
    // Simulate import process
    if (files.length > 0) {
      setTimeout(() => {
        setUploadStatus("success");
        // In a real app, you would process the files here
        // and then close the dialog after success
        setTimeout(() => {
          setFiles([]);
          setUploadStatus("idle");
        }, 1500);
      }, 1000);
    }
  }, [files]);

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "csv":
        return <TbFileText className={styles["fileIconBlue"]} />;
      case "pdf":
        return <TbFileTypePdf className={styles["fileIconRed"]} />;
      case "xlsx":
      case "xls":
        return <TbFileSpreadsheet className={styles["fileIconGreen"]} />;
      default:
        return <TbFile className={styles["fileIconGray"]} />;
    }
  };

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as ImportFileFormat);
    // Clear files when switching tabs since file types differ
    setFiles([]);
    setUploadStatus("idle");
  }, []);

  const handleRemoveClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const idxAttr = (e.currentTarget as HTMLButtonElement).dataset["index"];
      if (idxAttr) {
        removeFile(Number(idxAttr));
      }
    },
    [removeFile],
  );

  const fileKey = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-[525px]'>
        <DialogHeader>
          <DialogTitle>Import Invoices</DialogTitle>
          <DialogDescription>Upload your invoice files to import them into the system.</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className='w-full'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='csv'>CSV</TabsTrigger>
            <TabsTrigger value='pdf'>PDF</TabsTrigger>
            <TabsTrigger value='xlsx'>Excel</TabsTrigger>
          </TabsList>

          <main
            className={`${styles["dropzone"]} ${isDragActive ? styles["dropzoneActive"] : styles["dropzoneIdle"]}`}
            // eslint-disable-next-line react/jsx-props-no-spreading -- react-dropzone requires spreading props for accessibility
            {...getRootProps()}>
            <input
              // eslint-disable-next-line react/jsx-props-no-spreading -- react-dropzone requires spreading input props for proper file upload functionality
              {...getInputProps()}
            />
            <main className={styles["dropzoneContent"]}>
              <motion.div
                className={styles["uploadIconWrapper"]}
                animate={isDragActive ? {scale: 1.1} : {scale: 1}}
                transition={{duration: 0.2}}>
                <TbUpload className={styles["uploadIcon"]} />
              </motion.div>
              <h3 className={styles["dropzoneTitle"]}>{isDragActive ? "Drop files here..." : "Drag & drop files here"}</h3>
              <p className={styles["dropzoneSubtitle"]}>or click to browse files</p>
              <p className={styles["dropzoneHint"]}>
                {activeTab === "csv" && "Accepts .csv files (max 10MB)"}
                {activeTab === "pdf" && "Accepts .pdf files (max 10MB)"}
                {activeTab === "xlsx" && "Accepts .xlsx and .xls files (max 10MB)"}
              </p>
            </main>
          </main>

          {files.length > 0 && (
            <main className={styles["fileListWrapper"]}>
              <h4 className={styles["fileListTitle"]}>Selected Files</h4>
              <main className={styles["fileList"]}>
                {files.map((file, index) => (
                  <main
                    key={fileKey(file)}
                    className={styles["fileItem"]}>
                    <main className={styles["fileInfo"]}>
                      {getFileIcon(file.name)}
                      <span className={styles["fileName"]}>{file.name}</span>
                    </main>
                    <Button
                      variant='ghost'
                      size='sm'
                      data-index={index}
                      onClick={handleRemoveClick}>
                      Remove
                    </Button>
                  </main>
                ))}
              </main>
            </main>
          )}
        </Tabs>

        <AnimatePresence>
          {uploadStatus === "success" && (
            <motion.div
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0}}
              className={styles["statusSuccess"]}>
              <TbCheck className={styles["statusIcon"]} />
              <span>Files imported successfully!</span>
            </motion.div>
          )}

          {uploadStatus === "error" && (
            <motion.div
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0}}
              className={styles["statusError"]}>
              <TbAlertCircle className={styles["statusIcon"]} />
              <span>Error importing files. Please try again.</span>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={files.length === 0 || uploadStatus !== "idle"}>
            Import {files.length > 0 && `(${files.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
