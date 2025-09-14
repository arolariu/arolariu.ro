import {Card, CardContent, Progress} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";

/**
 * Upload progress component for invoice scans.
 * @returns JSX.Element that displays the upload progress for invoice scans.
 */
export default function UploadProgress(): React.JSX.Element {
  const {isUploading, uploadProgress} = useInvoiceCreator();

  const show = Boolean(isUploading);
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          className='mb-8'
          initial={{opacity: 0, y: 12}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -12}}>
          <Card className='border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'>
            <CardContent className='p-6'>
              <div className='mb-3 flex items-center gap-4'>
                <motion.div
                  className='border-top-transparent h-6 w-6 rounded-full border-2 border-purple-600'
                  animate={{rotate: 360}}
                  transition={{duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear"}}
                  style={{borderTopColor: "transparent"}}
                />
                <span className='font-semibold text-gray-900 dark:text-white'>Processing your files...</span>
              </div>
              <Progress
                value={uploadProgress}
                className='h-2'
              />
              <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>{uploadProgress}% complete</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
