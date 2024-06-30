/** @format */

"use client";

import {ToastAction} from "@/components/ui/toast";
import {useToast} from "@/components/ui/use-toast";
import useUserInformation from "@/hooks/useUserInformation";
import fetchBlobFromAzureStorage from "@/lib/actions/azure/fetchBlob";
import uploadBlobToAzureStorage from "@/lib/actions/azure/uploadBlob";
import uploadInvoice from "@/lib/actions/invoices/uploadInvoice";
import {extractBase64FromBlob} from "@/lib/utils.client";
import {useRouter} from "next/navigation";
import {useState} from "react";
import InvoicePreview from "./_components/InvoicePreview";
import InvoiceSubmitForm from "./_components/InvoiceSubmitForm";

/**
 * This function renders the invoice upload page.
 * @returns The JSX for the invoice upload page.
 */
export default function RenderCreateInvoiceScreen() {
  const {toast} = useToast();
  const router = useRouter();
  const [image, setImage] = useState<Blob | null>(null);
  const {userInformation} = useUserInformation({dependencyArray: [image]});
  const [imageIdentifier, setImageIdentifier] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"SUCCESS" | "PENDING" | null>(null);

  const resetState = () => {
    setImage(null);
    setUploadStatus(null);
  };

  const ctaText =
    image !== null
      ? "Review the uploaded receipt photo. If it is correct, proceed to the next step."
      : "Carefully photograph or scan your paper receipt. Attach the digital image from your device, here.";

  const handleImageClientSideUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const {files} = event.target;
    if (files && files.length > 0) {
      const image = files[0] as Blob;
      setImage(image);
      const imageAsBase64 = await extractBase64FromBlob(image);
      toast({
        variant: "default",
        title: "Please wait for the photo to be processed...",
        duration: 5000,
      });
      setUploadStatus("PENDING");
      const blobStorageResponse = await uploadBlobToAzureStorage("invoices", imageAsBase64);
      setUploadStatus("SUCCESS");
      setImageIdentifier(blobStorageResponse.blobName);
    }
  };

  const handleImageServerSideUpload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const blobInformation = await fetchBlobFromAzureStorage("invoices", imageIdentifier!);
    const {status, identifier} = await uploadInvoice(blobInformation, userInformation!);

    if (status === "SUCCESS")
      toast({
        variant: "destructive",
        title: "Receipt uploaded successfully!",
        duration: 5000,
        action: (
          <ToastAction
            altText='Navigate to receipt.'
            onClick={() => router.push(`/domains/invoices/view-invoice/${identifier}`)}>
            Navigate to receipt.
          </ToastAction>
        ),
      });
    else
      toast({
        variant: "destructive",
        title: "Receipt upload failed!",
        duration: 5000,
        action: (
          <ToastAction
            altText='Try again.'
            onClick={() => {
              resetState();
            }}>
            Try again.
          </ToastAction>
        ),
      });
  };

  return (
    <section className='h-full w-full'>
      <InvoicePreview image={image} />
      <h1 className='mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-xl font-medium text-transparent'>
        {image !== null ? "IS THIS THE CORRECT PHOTO...?!" : "UPLOAD A PICTURE OF THE PAPER RECEIPT"}
      </h1>
      <p className='mx-auto text-base leading-relaxed lg:w-2/3'>
        {ctaText.split(".").map((text, index) => (
          <span key={index}>
            {text}
            {index < ctaText.split(".").length - 1 && "."}
            <br />
          </span>
        ))}
      </p>

      <InvoiceSubmitForm
        image={image}
        uploadStatus={uploadStatus}
        resetState={resetState}
        handleImageClientSideUpload={handleImageClientSideUpload}
        handleImageServerSideUpload={handleImageServerSideUpload}
      />
    </section>
  );
}
