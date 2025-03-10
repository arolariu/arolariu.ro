/** @format */

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
import {AnimatePresence, motion} from "framer-motion";
import {useCallback, useRef, useState} from "react";
import {TbAlertCircle, TbCheck, TbFile, TbFileSpreadsheet, TbFileText, TbFileTypePdf, TbUpload} from "react-icons/tb";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ImportDialog({open, onOpenChange}: Readonly<Props>) {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<string>("csv");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  }, []);

  const handleFiles = (newFiles: File[]) => {
    // Filter files based on active tab
    const filteredFiles = newFiles.filter((file) => {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (activeTab === "csv") return extension === "csv";
      if (activeTab === "pdf") return extension === "pdf";
      if (activeTab === "xlsx") return extension === "xlsx" || extension === "xls";
      return false;
    });

    if (filteredFiles.length > 0) {
      setFiles((prev) => [...prev, ...filteredFiles]);
      setUploadStatus("idle");
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    // Simulate import process
    if (files.length > 0) {
      setTimeout(() => {
        setUploadStatus("success");
        // In a real app, you would process the files here
        // and then close the dialog after success
        setTimeout(() => {
          onOpenChange(false);
          setFiles([]);
          setUploadStatus("idle");
        }, 1500);
      }, 1000);
    }
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    if (extension === "csv") return <TbFileText className='h-5 w-5 text-blue-500' />;
    if (extension === "pdf") return <TbFileTypePdf className='h-5 w-5 text-red-500' />;
    if (extension === "xlsx" || extension === "xls") return <TbFileSpreadsheet className='h-5 w-5 text-green-500' />;
    return <TbFile className='h-5 w-5 text-gray-500' />;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[525px]'>
        <DialogHeader>
          <DialogTitle>Import Invoices</DialogTitle>
          <DialogDescription>Upload your invoice files to import them into the system.</DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='w-full'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='csv'>CSV</TabsTrigger>
            <TabsTrigger value='pdf'>PDF</TabsTrigger>
            <TabsTrigger value='xlsx'>Excel</TabsTrigger>
          </TabsList>

          <div className='mt-4'>
            <div
              className={`rounded-lg border-2 border-dashed p-6 transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}>
              <input
                type='file'
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className='hidden'
                accept={activeTab === "csv" ? ".csv" : activeTab === "pdf" ? ".pdf" : ".xlsx,.xls"}
                multiple
              />
              <div className='flex flex-col items-center justify-center space-y-2 text-center'>
                <div className='rounded-full bg-primary/10 p-3'>
                  <TbUpload className='h-6 w-6 text-primary' />
                </div>
                <h3 className='font-medium'>Drag & drop files here</h3>
                <p className='text-muted-foreground text-sm'>or click to browse files</p>
                <p className='text-muted-foreground text-xs'>
                  {activeTab === "csv" && "Accepts .csv files"}
                  {activeTab === "pdf" && "Accepts .pdf files"}
                  {activeTab === "xlsx" && "Accepts .xlsx and .xls files"}
                </p>
              </div>
            </div>

            {files.length > 0 && (
              <div className='mt-4 space-y-2'>
                <h4 className='text-sm font-medium'>Selected Files</h4>
                <div className='max-h-[150px] space-y-2 overflow-y-auto'>
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className='bg-muted/50 flex items-center justify-between rounded-md p-2'>
                      <div className='flex items-center space-x-2'>
                        {getFileIcon(file.name)}
                        <span className='max-w-[300px] truncate text-sm'>{file.name}</span>
                      </div>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Tabs>

        <AnimatePresence>
          {uploadStatus === "success" && (
            <motion.div
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0}}
              className='flex items-center space-x-2 rounded-md bg-green-50 p-2 text-green-600'>
              <TbCheck className='h-5 w-5' />
              <span>Files imported successfully!</span>
            </motion.div>
          )}

          {uploadStatus === "error" && (
            <motion.div
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0}}
              className='flex items-center space-x-2 rounded-md bg-red-50 p-2 text-red-600'>
              <TbAlertCircle className='h-5 w-5' />
              <span>Error importing files. Please try again.</span>
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}>
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

