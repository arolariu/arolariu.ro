/** @format */

"use client";

import {useUserInformation} from "@/hooks";
import uploadInvoice from "@/lib/actions/invoices/uploadInvoice";
import {extractBase64FromBlob} from "@/lib/utils.client";
import type {UploadStatus} from "@/types";
import {toast} from "@arolariu/components";
import {useCallback, useState} from "react";
import InvoicePreview from "./_components/InvoicePreview";
import InvoiceSubmitForm from "./_components/InvoiceSubmitForm";
import InvoiceSubtitle from "./_components/InvoiceSubtitle";

/**
 * This function renders the invoice upload page.
 * @returns The JSX for the invoice upload page.
 */
export default function RenderCreateInvoiceScreen() {
  const {userInformation} = useUserInformation();
  const [images, setImages] = useState<Blob[]>([]);
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
        setUploadStatus("SUCCESS__CLIENTSIDE");
        toast("Upload successful", {
          description: `${images.length} images uploaded.`,
          duration: 5000,
          style: {
            backgroundColor: "green",
            color: "white",
          },
          icon: <span className='text-white'>✔️</span>,
        });
      }
    } catch (error: unknown) {
      console.error(">>> Error in handleImageClientSideUpload:", error as Error);
      setUploadStatus("FAILURE__CLIENTSIDE");
    }
  }, []);

  const handleImageServerSideUpload = useCallback(
    async (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      if (userInformation === null) return;
      try {
        event.preventDefault();
        setUploadStatus("PENDING__SERVERSIDE");
        const imagesCopy = [...images];
        // eslint-disable-next-line functional/no-loop-statements
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
    },
    [images, userInformation],
  );

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
