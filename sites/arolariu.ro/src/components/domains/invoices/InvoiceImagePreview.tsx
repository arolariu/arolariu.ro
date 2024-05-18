/** @format */

import Image from "next/image";

interface Props {
  image?: Blob;
}

/**
 * This function renders the invoice image preview.
 * @param image The image to preview.
 * @returns The JSX for the invoice image preview.
 */
export default function InvoiceImagePreview({image}: Readonly<Props>) {
  const allowedFormats = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  if (image != undefined && allowedFormats.includes(image.type)) {
    return image.type === "application/pdf" ? (
      <div className='mx-auto mb-10 w-2/3 md:w-1/2 lg:w-1/3 xl:w-1/4'>
        <iframe
          title='Submitted receipt PDF'
          src={URL.createObjectURL(image)}
          width='100%'
          height='600px'
          sandbox=''
        />
      </div>
    ) : (
      <Image
        className='mx-auto mb-10 h-2/3 w-2/3 rounded object-fill object-center md:h-1/2 md:w-1/2 lg:h-1/3 lg:w-1/3 xl:h-1/4 xl:w-1/4'
        alt='Submitted receipt image'
        src={URL.createObjectURL(image)}
        width='600'
        height='900'
      />
    );
  } else {
    return (
      <Image
        className='mx-auto mb-10 h-2/3 w-2/3 rounded object-fill object-center md:h-1/2 md:w-1/2 lg:h-1/3 lg:w-1/3 xl:h-1/4 xl:w-1/4'
        alt='Default dummy image'
        src='https://dummyimage.com/600x900&text=placeholder'
        width='600'
        height='900'
      />
    );
  }
}
