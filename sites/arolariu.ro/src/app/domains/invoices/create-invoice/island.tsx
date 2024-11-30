/** @format */

"use client";

import useUserInformation from "@/hooks/useUserInformation";
import uploadInvoice from "@/lib/actions/invoices/uploadInvoice";
import {extractBase64FromBlob} from "@/lib/utils.client";
import {UploadStatus} from "@/types/UploadStatus";
import {useState} from "react";
import InvoicePreview from "./_components/InvoicePreview";
import InvoiceSubmitForm from "./_components/InvoiceSubmitForm";
import InvoiceSubtitle from "./_components/InvoiceSubtitle";

/**
 * This function renders the invoice upload page.
 * @returns The JSX for the invoice upload page.
 */
export default function RenderCreateInvoiceScreen() {
  const [images, setImages] = useState<Blob[]>([]);
  const {userInformation} = useUserInformation({dependencyArray: [images]});
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>(UploadStatus.UNKNOWN);

  const resetState = () => {
    setImages([]);
    setUploadStatus(UploadStatus.UNKNOWN);
  };

  const handleImageClientSideUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const {files} = event.target;
    if (files && files.length > 0) {
      const images = [...files] as Blob[];
      setImages(images);
      // TODO: toast that informs user that images have been uploaded with action to clear images.
    }
  };

  const handleImageServerSideUpload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const imagesCopy = [...images];
    for (const image of imagesCopy) {
      const base64 = await extractBase64FromBlob(image); // client-action
      const {status} = await uploadInvoice(base64, userInformation!); // server-action
      if (status === "SUCCESS") {
        setImages((images) => {
          return images.filter((imageInState) => imageInState !== image);
        });
      }
    }
  };

  return (
    <section className='h-full w-full'>
      <InvoicePreview images={images} />
      <InvoiceSubtitle images={images} />
      <InvoiceSubmitForm
        images={images}
        uploadStatus={uploadStatus}
        resetState={resetState}
        handleImageClientSideUpload={handleImageClientSideUpload}
        handleImageServerSideUpload={handleImageServerSideUpload}
      />
    </section>
  );
}
