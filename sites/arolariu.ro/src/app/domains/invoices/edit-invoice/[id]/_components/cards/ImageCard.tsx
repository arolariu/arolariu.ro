import type {Invoice} from "@/types/invoices";
import {Button, Card, CardContent, CardFooter, CardHeader, CardTitle, Tooltip, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {TbZoomInArea} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";

type Props = {invoice: Invoice};

/**
 * Displays the receipt image with zoom/expand capabilities for the edit-invoice page.
 *
 * @remarks
 * **Rendering Context**: Client Component (uses `useDialog` hook for image expansion).
 *
 * **Features**:
 * - **Image Preview**: Displays first scanned receipt image with hover zoom effect
 * - **Expand Dialog**: Click image or button to open full-size view in `ImageDialog`
 * - **Fallback**: Uses placeholder image if no scans are available
 *
 * **Interaction Pattern**: The image is clickable and triggers the `INVOICE_IMAGE`
 * dialog in "view" mode, passing the photo URL as payload. Uses Framer Motion
 * for scale-on-hover feedback.
 *
 * **Accessibility**: Image has `aria-hidden` since it's decorative with an
 * explicit "Expand Image" button for keyboard users.
 *
 * @param props - Component properties containing the invoice with scan data
 * @returns Client-rendered card with receipt image preview and expand controls
 *
 * @example
 * ```tsx
 * <ImageCard invoice={invoice} />
 * // Displays receipt thumbnail with expand button
 * ```
 *
 * @see {@link ImageDialog} - Full-screen image viewer dialog
 * @see {@link useDialog} - Dialog management hook
 */
export default function ImageCard({invoice}: Readonly<Props>): React.JSX.Element {
  const photoLocation = invoice.scans[0]?.location ?? "https://dummyimage.com/600x900&text=placeholder+image";
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
