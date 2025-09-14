import {Badge, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {AnimatePresence, motion} from "motion/react";
import Image from "next/image";
import {useCallback} from "react";
import {TbEdit, TbRotateClockwise, TbTrash} from "react-icons/tb";
import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";
import type {InvoiceScan} from "../_types/InvoiceScan";

type MediaPreviewProps = {file: InvoiceScan};

/**
 * Media preview component for invoice scans.
 * @returns JSX.Element that displays a preview of the invoice scan.
 */
export default function MediaPreview({file}: Readonly<MediaPreviewProps>): React.JSX.Element {
  const {rotateScan, renameScan, removeScan} = useInvoiceCreator();
  const showProcessing = Boolean(file.isProcessing);

  const handleRotate = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      rotateScan(file.id, 90);
    },
    [rotateScan, file.id],
  );

  const handleRename = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      const newName = prompt("Enter new filename:", file.name);
      if (newName) {
        renameScan(file.id, newName);
      }
    },
    [renameScan, file.id, file.name],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      removeScan(file.id);
    },
    [removeScan, file.id],
  );

  return (
    <div className='group relative overflow-hidden rounded-lg bg-white/80 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl dark:bg-gray-900'>
      <AnimatePresence>
        {showProcessing ? (
          <motion.div
            className='absolute inset-0 z-30 flex items-center justify-center bg-purple-500/20 backdrop-blur-sm'
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}>
            <div className='flex items-center gap-3 rounded-lg bg-white/90 p-4 dark:bg-gray-800'>
              <motion.div
                className='h-6 w-6 rounded-full border-2 border-purple-600 border-t-transparent'
                animate={{rotate: 360}}
                transition={{duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear"}}
              />
              <span className='font-medium text-gray-900 dark:text-white'>Processing...</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {file.type === "pdf" && (
        <motion.div
          className='absolute top-3 left-3 z-20'
          initial={{y: -20, opacity: 0}}
          animate={{y: 0, opacity: 1}}>
          <Badge className='bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'>PDF</Badge>
        </motion.div>
      )}

      <div className='relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900'>
        {file.type === "pdf" ? (
          <iframe
            src={file.preview}
            className='h-full w-full border-0 transition-transform duration-500 group-hover:scale-105'
            title={`Preview of ${file.name}`}
            sandbox=''
          />
        ) : (
          <Image
            src={file.preview || "/placeholder.svg?height=300&width=300&query=invoice%20image%20placeholder"}
            alt={file.name}
            width={300}
            height={300}
            className='h-full w-full object-cover transition-transform duration-500 group-hover:scale-110'
            style={{
              transform: `rotate(${file.rotation ?? 0}deg)`,
              filter: `brightness(${file.brightness ?? 100}%) contrast(${file.contrast ?? 100}%) saturate(${file.saturation ?? 100}%)`,
            }}
            priority={false}
            // Guard for leaked render: show empty placeholder when preview missing
            placeholder='empty'
          />
        )}
        <div className='absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100' />
      </div>

      <motion.div className='absolute right-3 bottom-3 z-20 flex gap-2'>
        <TooltipProvider>
          {file.type === "image" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size='sm'
                  variant='secondary'
                  className='h-10 w-10 cursor-pointer border-2 border-white bg-white p-0 shadow-xl transition-all duration-200 hover:scale-110 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                  onClick={handleRotate}>
                  <TbRotateClockwise className='h-4 w-4 text-gray-700 dark:text-gray-100' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Rotate 90°</TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='sm'
                variant='secondary'
                className='h-10 w-10 cursor-pointer border-2 border-white bg-white p-0 shadow-xl transition-all duration-200 hover:scale-110 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                onClick={handleRename}>
                <TbEdit className='h-4 w-4 text-gray-700 dark:text-gray-100' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Rename file</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size='sm'
                variant='destructive'
                className='h-10 w-10 cursor-pointer border-2 border-white bg-red-500 p-0 shadow-xl transition-all duration-200 hover:scale-110 hover:bg-red-600 dark:border-gray-700'
                onClick={handleDelete}>
                <TbTrash className='h-4 w-4 text-white' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete file</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>

      <div className='absolute bottom-3 left-3 z-20 opacity-0 transition-opacity duration-300 group-hover:opacity-100'>
        <div className='rounded-lg border border-white/20 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95'>
          <p className='max-w-32 truncate text-xs font-medium text-gray-800 dark:text-gray-200'>{file.name}</p>
          <p className='text-xs text-gray-500 dark:text-gray-400'>{(file.size / 1024 / 1024).toFixed(1)} MB</p>
        </div>
      </div>
    </div>
  );
}
