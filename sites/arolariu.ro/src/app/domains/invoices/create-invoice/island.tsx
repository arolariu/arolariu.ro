/** @format */

"use client";

import useUserInformation from "@/hooks/useUserInformation";
import uploadInvoice from "@/lib/actions/invoices/uploadInvoice";
import {extractBase64FromBlob} from "@/lib/utils.client";
import {UploadStatus} from "@/types/UploadStatus";
import {useCallback, useState} from "react";
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
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("UNKNOWN");

  const resetState = useCallback(() => {
    setImages([]);
    setUploadStatus("UNKNOWN");
  }, []);

  const handleImageClientSideUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      event.preventDefault();
      setUploadStatus("PENDING__CLIENTSIDE");
      const {files} = event.target;
      if (files && files.length > 0) {
        const images = [...files] as Blob[];
        setImages(images);
        // TODO: toast that informs user that images have been uploaded with action to clear images.
        setUploadStatus("SUCCESS__CLIENTSIDE");
      }
    } catch (error: unknown) {
      console.error(">>> Error in handleImageClientSideUpload:", error as Error);
      setUploadStatus("FAILURE__CLIENTSIDE");
    }
  }, []);

  const handleImageServerSideUpload = async (
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    try {
      event.preventDefault();
      setUploadStatus("PENDING__SERVERSIDE");
      const imagesCopy = [...images];
      for (const image of imagesCopy) {
        const blobInformation = await extractBase64FromBlob(image); // client-action
        const {status} = await uploadInvoice({blobInformation, userInformation}); // server-action
        if (status === "SUCCESS") {
          setImages((images) => {
            return images.filter((imageInState) => imageInState !== image);
          });
        }
      }
      setUploadStatus("SUCCESS__SERVERSIDE");
    } catch (error: unknown) {
      console.error(">>> Error in handleImageServerSideUpload:", error as Error);
      setUploadStatus("FAILURE__SERVERSIDE");
    }
  };

  return (
    <section className='h-full w-full'>
      <InvoicePreview
        images={images}
        setImages={setImages}
      />
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
