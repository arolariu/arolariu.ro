/** @format */

import Invoice from "@/types/invoices/Invoice";
import Image from "next/image";
import {useEffect, useState} from "react";

/**
 * This function renders the edit invoice photo preview.
 * @returns The JSX for the edit invoice photo preview.
 */
export default function InvoicePhotoPreview({invoice}: Readonly<{invoice: Invoice}>) {
  const [photoAsBlob, setPhotoAsBlob] = useState<undefined | Blob>();

  useEffect(() => {
    const fetchPhoto = async () => {
      if (invoice.photoLocation) {
        try {
          const response = await fetch(invoice.photoLocation);
          const blob = await response.blob();
          setPhotoAsBlob(blob);
        } catch (error) {
          console.error("Error fetching photo:", error);
        }
      }
    };

    fetchPhoto().catch((error: unknown) => console.error("Error fetching photo:", error));
  }, [invoice.photoLocation]);

  if (photoAsBlob) {
    return photoAsBlob.type === "application/pdf" ? (
      <div className='mx-auto mb-10 w-2/3 md:w-1/2 lg:w-1/3 xl:w-1/4'>
        <iframe
          title='Submitted receipt PDF'
          src={URL.createObjectURL(photoAsBlob)}
          width='100%'
          height='600px'
          sandbox=''
        />
      </div>
    ) : (
      <Image
        className='block rounded-lg border-2 border-dashed border-gray-700 object-fill object-center'
        alt='Submitted receipt image'
        src={URL.createObjectURL(photoAsBlob)}
        width={900}
        height={1800}
      />
    );
  }
  return (
    <Image
      className='mb-10 block w-full rounded object-cover object-center'
      alt='Default dummy image'
      src='https://dummyimage.com/600x900&text=placeholder'
      width={900}
      height={900}
    />
  );
}
