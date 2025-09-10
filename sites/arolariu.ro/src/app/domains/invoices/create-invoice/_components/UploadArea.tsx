import {Button} from "@arolariu/components";
import {motion} from "motion/react";
import {useCallback, useRef, useState} from "react";
import {TbUpload} from "react-icons/tb";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";

/**
 * Upload area component for invoice scans.
 * @returns JSX.Element that displays the upload area for invoice scans.
 */
export default function UploadArea(): React.JSX.Element | null {
  const {scans, addFiles, isUploading} = useInvoiceCreator();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOnDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleChooseFilesClick = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
    },
    [addFiles],
  );

  if (scans.length > 0) {
    return null;
  }

  return (
    <motion.div
      initial={{opacity: 0, scale: 0.95}}
      animate={{opacity: 1, scale: 1}}
      transition={{duration: 0.25}}
      className={`mb-16 rounded-lg border-2 border-dashed p-16 text-center transition-all duration-300 ${
        isDragOver
          ? "scale-105 border-purple-400 bg-purple-50 dark:bg-purple-900/20"
          : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50 dark:border-gray-600 dark:bg-gray-900/50 dark:hover:bg-purple-900/20"
      }`}
      onDrop={handleOnDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}>
      <motion.div
        animate={isDragOver ? {scale: 1.05} : {scale: 1}}
        transition={{duration: 0.2}}>
        <motion.div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500'>
          <TbUpload className='h-10 w-10 text-white' />
        </motion.div>
        <h3 className='mb-4 text-2xl font-bold text-gray-900 lg:text-3xl dark:text-white'>Upload your invoice scans</h3>
        <p className='mb-6 text-lg text-gray-600 dark:text-gray-300'>Drag and drop your files here, or click to browse</p>
        <p className='mb-8 text-sm text-gray-500 dark:text-gray-400'>Supports JPG, PNG, PDF files up to 10MB each</p>
        <Button
          onClick={handleChooseFilesClick}
          className='cursor-pointer bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 text-lg text-white shadow-lg transition-all duration-300 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl'
          disabled={isUploading}
          size='lg'>
          {isUploading ? "Processing..." : "Choose Files"}
        </Button>
        <input
          ref={inputRef}
          type='file'
          multiple
          accept='image/*,.pdf'
          onChange={handleFileChange}
          className='hidden'
        />
      </motion.div>
    </motion.div>
  );
}
