import {Button} from "@arolariu/components";
import {motion} from "motion/react";
import {useCallback, useEffect, useRef} from "react";
import {TbPlayerPlay, TbPlus, TbTrash} from "react-icons/tb";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";

/**
 * Upload stats component for invoice scans.
 * @returns JSX.Element that displays the upload stats for invoice scans.
 */
export default function UploadStats(): React.JSX.Element | null {
  const {scans, addFiles, clearAll, isProcessingNext, processNextStep} = useInvoiceCreator();
  const hiddenPickerRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*,.pdf";

    const handleChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        addFiles(target.files);
      }
    };

    input.addEventListener("change", handleChange);
    hiddenPickerRef.current = input;

    return () => {
      input.removeEventListener("change", handleChange);
      hiddenPickerRef.current = null;
    };
  }, [addFiles]);

  const handleAddMoreClick = useCallback(() => {
    const input = hiddenPickerRef.current;
    if (!input) {
      return;
    }
    // reset to allow re-selecting the same files
    input.value = "";
    input.click();
  }, []);

  if (scans.length === 0) {
    return null;
  }

  return (
    <motion.div
      className='mt-12 mb-8 rounded-3xl border border-white/20 bg-gradient-to-br from-blue-700 to-purple-700 p-8 text-white shadow-2xl sm:mb-12 sm:p-10' // Added mt-12
      initial={{opacity: 0, y: 50}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.6, delay: 0.5}}>
      <h2 className='mb-8 text-center text-3xl font-bold'>Your Upload Summary</h2>

      <div className='flex flex-col items-center justify-center gap-4 sm:gap-6 md:flex-row'>
        <Button
          onClick={handleAddMoreClick}
          className='w-full cursor-pointer border border-white/30 bg-white/20 px-8 py-3 text-lg text-white shadow-lg transition-all duration-300 hover:bg-white/30 hover:shadow-xl sm:w-auto'
          size='lg'>
          <TbPlus className='mr-2 h-5 w-5' />
          Add More Files
        </Button>
        <Button
          onClick={processNextStep}
          className='w-full cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500 px-8 py-3 text-lg text-white shadow-lg transition-all duration-300 hover:from-pink-600 hover:to-purple-600 hover:shadow-xl sm:w-auto'
          disabled={scans.length === 0 || isProcessingNext}
          size='lg'>
          {isProcessingNext ? (
            "Processing Files..."
          ) : (
            <>
              <TbPlayerPlay className='mr-2 h-5 w-5' /> Continue to Next Step
            </>
          )}
        </Button>
        <Button
          variant='destructive'
          onClick={clearAll}
          className='w-full cursor-pointer border border-red-400/30 bg-red-500/20 px-8 py-3 text-lg text-white shadow-lg transition-all duration-300 hover:bg-red-500/30 hover:shadow-xl sm:w-auto'
          size='lg'
          disabled={isProcessingNext}>
          <TbTrash className='mr-2 h-5 w-5' />
          Clear All Files
        </Button>
      </div>
    </motion.div>
  );
}
