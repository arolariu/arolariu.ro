/** @format */

import Image from "next/image";
import {type Dispatch, type SetStateAction} from "react";

type Props = {images: Blob[]; setImages: Dispatch<SetStateAction<Blob[]>>};

/**
 * This function renders the invoice images preview.
 * @param images The images to preview.
 * @returns The JSX for the invoice images preview.
 */
export default function InvoicePreview({images, setImages}: Readonly<Props>) {
  console.log(setImages);
  if (images.length > 0) {
    return <div>TABS !! //FIXME! </div>;
  }

  return (
    <Image
      className='mx-auto mb-10 h-2/3 w-2/3 rounded object-fill object-center p-10 md:h-1/2 md:w-1/2 lg:h-1/3 lg:w-1/3 xl:h-1/4 xl:w-1/4'
      alt='Default dummy image'
      src='https://dummyimage.com/600x900&text=placeholder'
      width='600'
      height='900'
    />
  );
}
