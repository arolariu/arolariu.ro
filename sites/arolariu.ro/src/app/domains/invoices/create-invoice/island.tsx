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
import InvoiceExtensionAlert from "./_components/InvoiceExtensionAlert";
import InvoicePreview from "./_components/InvoicePreview";

const InitialUploadForm = ({
  handleImageClientSideUpload,
}: Readonly<{handleImageClientSideUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>}>) => {
  return (
    <form className='my-5'>
      <input
        type='file'
        name='file-upload'
        className='file-input file-input-bordered file-input-primary w-full max-w-xs bg-white dark:bg-black'
        title='Upload a receipt to the platform.'
        onChange={handleImageClientSideUpload}
      />
      <button
        type='submit'
        title='Submit button.'
        className='hidden'
      />
    </form>
  );
};

const FinalUploadForm = ({
  uploadStatus,
  handleImageServerSideUpload,
  resetState,
}: Readonly<{
  uploadStatus: "SUCCESS" | "PENDING" | null;
  handleImageServerSideUpload: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
  resetState: () => void;
}>) => {
  return (
    <form className='flex flex-col flex-nowrap'>
      <button
        className='btn btn-primary mx-auto mt-4'
        type='button'
        disabled={uploadStatus === "PENDING"}
        onClick={handleImageServerSideUpload}>
        Continue to the next step
      </button>
      <button
        className='btn btn-secondary mx-auto mt-4'
        type='button'
        disabled={uploadStatus === "PENDING"}
        onClick={resetState}>
        Clear the image
      </button>
    </form>
  );
};

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
  const [isValidMimeType, setIsValidMimeType] = useState<boolean | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"SUCCESS" | "PENDING" | null>(null);
  const validMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);

  const resetState = () => {
    setImage(null);
    setIsValidMimeType(null);
    setUploadStatus(null);
  };

  const ctaText =
    isValidMimeType === true
      ? "Review the uploaded receipt photo. If it is correct, proceed to the next step."
      : "Carefully photograph or scan your paper receipt. Attach the digital image from your device, here.";

  const handleImageClientSideUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const {files} = event.target;
    if (files && files.length > 0) {
      const image = files[0] as Blob;
      const isValidMimeType = validMimeTypes.has(image.type);
      setImage(isValidMimeType ? image : null);
      setIsValidMimeType(isValidMimeType);
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

    toast({
      variant: "destructive",
      title: status === "SUCCESS" ? "Receipt uploaded successfully!" : "Failed to upload the receipt.",
      duration: 5000,
      action:
        status === "SUCCESS" ? (
          <ToastAction
            altText='Navigate to receipt.'
            onClick={() => router.push(`/domains/invoices/view-invoice/${identifier}`)}>
            Navigate to receipt.
          </ToastAction>
        ) : (
          <ToastAction
            altText='Try again.'
            onClick={() => setIsValidMimeType(null)}>
            Try again.
          </ToastAction>
        ),
    });
    resetState();
  };

  return (
    <section className='h-full w-full'>
      <InvoicePreview image={image} />
      <h1 className='mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-xl font-medium text-transparent'>
        {isValidMimeType === true ? "IS THIS THE CORRECT PHOTO...?!" : "UPLOAD A PICTURE OF THE PAPER RECEIPT"}
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

      {isValidMimeType !== true && <InitialUploadForm handleImageClientSideUpload={handleImageClientSideUpload} />}
      {isValidMimeType === false && <InvoiceExtensionAlert />}
      {isValidMimeType === true && (
        <FinalUploadForm
          uploadStatus={uploadStatus}
          handleImageServerSideUpload={handleImageServerSideUpload}
          resetState={resetState}
        />
      )}
    </section>
  );
}
