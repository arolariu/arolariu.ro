import {Button} from "@arolariu/components";
import {motion} from "motion/react";
import {useCallback} from "react";
import {useDropzone} from "react-dropzone";
import {TbUpload} from "react-icons/tb";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";

/**
 * Upload area component for invoice scans.
 * Uses react-dropzone for file handling.
 * @returns JSX.Element that displays the upload area for invoice scans.
 */
export default function UploadArea(): React.JSX.Element | null {
  const {submissions, addSubmissions, clearAllSubmissions, processSubmission} = useInvoiceCreator();

  const onDrop = useCallback(
    (acceptedFiles: FileList | File[]) => {
      if (acceptedFiles.length > 0) {
        const fileList = new DataTransfer();
        // @ts-ignore -- FileList is iterable
        for (const file of acceptedFiles) {
          fileList.items.add(file);
        }
        addSubmissions(fileList.files);
      }
    },
    [addSubmissions],
  );

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "application/pdf": [".pdf"],
    },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  if (submissions.length === 0) {
    return (
      <div
        className={`mb-16 rounded-lg border-2 border-dashed p-16 text-center transition-all duration-300 ${
          isDragActive
            ? "scale-105 border-purple-400 bg-purple-50 dark:bg-purple-900/20"
            : "border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50 dark:border-gray-600 dark:bg-gray-900/50 dark:hover:bg-purple-900/20"
        } cursor-pointer`}
        // eslint-disable-next-line react/jsx-props-no-spreading -- react-dropzone requires spreading props for accessibility
        {...getRootProps()}>
        <motion.div
          animate={isDragActive ? {scale: 1.05} : {scale: 1}}
          transition={{duration: 0.2}}>
          <motion.div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-r from-purple-500 to-pink-500'>
            <TbUpload className='h-10 w-10 text-white' />
          </motion.div>
          <h3 className='mb-4 text-2xl font-bold text-gray-900 lg:text-3xl dark:text-white'>Upload your invoice scans</h3>
          <p className='mb-6 text-lg text-gray-600 dark:text-gray-300'>
            {isDragActive ? "Drop your files here..." : "Drag and drop your files here, or click to browse"}
          </p>
          <p className='mb-8 text-sm text-gray-500 dark:text-gray-400'>Supports JPG, PNG, PDF files up to 10MB each</p>
          <input
            // eslint-disable-next-line react/jsx-props-no-spreading -- react-dropzone requires spreading input props for proper file upload functionality
            {...getInputProps()}
          />
          <Button
            type='button'
            className='cursor-pointer bg-linear-to-r from-purple-600 to-pink-600 px-8 py-3 text-lg text-white shadow-lg transition-all duration-300 hover:from-purple-700 hover:to-pink-700 hover:shadow-xl'>
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
            ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20"
            : "border-gray-300 bg-transparent hover:border-purple-400 hover:bg-purple-50 dark:border-gray-700 dark:hover:bg-purple-900/20"
        } cursor-pointer`}
        // eslint-disable-next-line react/jsx-props-no-spreading -- react-dropzone requires spreading props for accessibility
        {...getRootProps()}>
        <input
          // eslint-disable-next-line react/jsx-props-no-spreading -- react-dropzone requires spreading input props for proper file upload functionality
          {...getInputProps()}
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
        <Button
          variant='outline'
          onClick={clearAllSubmissions}
          className='cursor-pointer'
          type='button'>
          Clear scans
        </Button>
        <Button
          onClick={processSubmission}
          className='cursor-pointer bg-linear-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
          type='button'>
          Submit scans
        </Button>
      </div>
    </div>
  );
}
