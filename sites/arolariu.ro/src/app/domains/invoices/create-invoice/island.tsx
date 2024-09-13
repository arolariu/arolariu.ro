/** @format */

"use client";

import {Button} from "@/components/ui/button";
import {ToastAction} from "@/components/ui/toast";
import {useToast} from "@/components/ui/use-toast";
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
  const {toast} = useToast();
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
      toast({
        title: `You have uploaded ${images.length} image${images.length > 1 ? "s" : ""}.`,
        variant: "default",
        duration: 3000,
        action: (
          <ToastAction
            altText='Clear'
            className='flex flex-row items-center justify-center justify-items-center gap-2'>
            <Button onClick={resetState}>Clear.</Button>
          </ToastAction>
        ),
      });
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
