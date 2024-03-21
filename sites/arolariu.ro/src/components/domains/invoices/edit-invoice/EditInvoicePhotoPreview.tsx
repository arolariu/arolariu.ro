import { useZustandStore } from "@/hooks/stateStore";
import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * This function renders the edit invoice photo preview.
 * @returns The JSX for the edit invoice photo preview.
 */
export default function EditInvoicePhotoPreview() {
  const invoice = useZustandStore((state) => state.selectedInvoice);
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

    fetchPhoto()
      .catch((error: unknown) => console.error("Error fetching photo:", error));
  }, [invoice.photoLocation]);

  if (photoAsBlob) {
    return photoAsBlob.type === "application/pdf" ? (
      <div className="w-2/3 mx-auto mb-10 md:w-1/2 lg:w-1/3 xl:w-1/4">
        <iframe
          title="Submitted receipt PDF"
          src={URL.createObjectURL(photoAsBlob)}
          width="100%"
          height="600px"
          sandbox="" />
      </div>
    )
      :
      <Image
        className="block object-fill object-center border-2 border-gray-700 border-dashed rounded-lg"
        alt="Submitted receipt image"
        src={URL.createObjectURL(photoAsBlob)}
        width={900}
        height={1800}
      />
  } else {
    return (
      <Image
        className="block object-cover object-center w-full mb-10 rounded"
        alt="Default dummy image"
        src="https://dummyimage.com/600x900&text=placeholder"
        width={900}
        height={900}
      />
    );
  }
}
