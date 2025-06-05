/** @format */

import type {Invoice} from "@/types/invoices";
import {Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Tooltip, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {TbZoomInArea} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";

type Props = {invoice: Invoice};

/**
 * The ImageCard component displays an image of a receipt.
 * It includes buttons for expanding the image and reuploading it.
 * @returns The ImageCard component, CSR'ed.
 */
export default function ImageCard({invoice}: Readonly<Props>): React.JSX.Element {
  const photoLocation = invoice.photoLocation ?? "https://dummyimage.com/600x900&text=placeholder+image";
  const {open} = useDialog("INVOICE_IMAGE", "view", photoLocation);

  return (
    <Card className='group overflow-hidden transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <CardTitle>Receipt Image</CardTitle>
      </CardHeader>
      <CardContent className='flex justify-center'>
        <motion.img
          transition={{type: "spring", stiffness: 300, damping: 10}}
          className='w-full rounded-md border object-cover hover:cursor-zoom-in'
          src={photoLocation}
          onClick={open}
          whileHover={{scale: 1.05}}
          alt=''
          aria-hidden
        />
      </CardContent>
      <CardFooter className='flex flex-col justify-end gap-2'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                className='w-full cursor-pointer'
                onClick={open}>
                <span>Expand Image</span>
                <TbZoomInArea className='ml-2 h-4 w-4 transition-transform' />
              </Button>
            </TooltipTrigger>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
