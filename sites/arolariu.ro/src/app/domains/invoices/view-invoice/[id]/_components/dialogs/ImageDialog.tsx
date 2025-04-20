/** @format */

import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@arolariu/components/dialog";
import Image from "next/image";
import {useDialog} from "../../_contexts/DialogContext";

/**
 * The ImageDialog component displays an image in a dialog.
 * It is used to show the image of a receipt when the user clicks on it.
 * @returns The ImageDialog component, CSR'ed.
 */
export default function ImageDialog(): React.JSX.Element {
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("image");

  const image = payload as string;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='h-full min-w-11/12'>
        <DialogHeader>
          <DialogTitle>Image ({image})</DialogTitle>
          <div className='relative h-full w-full'>
            <Image
              src={image}
              fill
              alt='Photo of receipt'
              className='h-full w-full rounded-md border object-cover'
            />
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
