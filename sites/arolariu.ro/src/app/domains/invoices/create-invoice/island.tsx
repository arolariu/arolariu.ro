"use client";

import InvoiceImagePreview from "@/components/domains/invoices/InvoiceImagePreview";
import AlertNotification from "@/components/domains/invoices/UploadAlertNotification";
import uploadInvoice from "@/lib/invoices/uploadInvoice";
import {extractBase64FromBlob} from "@/lib/utils.client";
import Link from "next/link";
import {useState} from "react";

type ImageState = {
  blob: undefined | Blob;
  identifier: string;
  status: "NOT_UPLOADED" | "CLIENT_SIDE_UPLOAD" | "SERVER_SIDE_UPLOAD";
};

/**
 * This function renders the invoice upload page.
 * @returns The JSX for the invoice upload page.
 */
export default function RenderCreateInvoiceScreen() {
  const [imageState, setImageState] = useState<ImageState>({
    blob: undefined,
    identifier: "",
    status: "NOT_UPLOADED",
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const files = event.target.files;
    if (files && files.length > 0) {
      const image = files[0] as Blob;
      setImageState({...imageState, blob: image, status: "CLIENT_SIDE_UPLOAD"});
    }
  };

  switch (imageState.status) {
    case "NOT_UPLOADED":
      return (
        <section className='h-full w-full'>
          <InvoiceImagePreview image={imageState.blob} />
          <h1 className='mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-xl font-medium text-transparent'>
            UPLOAD A PICTURE OF THE PAPER RECEIPT
          </h1>
          <p className='mx-auto text-base leading-relaxed lg:w-2/3'>
            Carefully photograph or scan your paper receipt. <br />
            Attach the digital image from your device, here.
          </p>

          <form className='my-5'>
            <input
              type='file'
              name='file'
              className='file-input file-input-bordered w-full max-w-xs bg-white dark:bg-black'
              title='Upload a receipt'
              onChange={handleImageUpload}
            />
            <button
              type='submit'
              title='Submit'
              className='hidden'
            />
          </form>
        </section>
      );

    case "CLIENT_SIDE_UPLOAD":
      return (
        <section className='h-full w-full'>
          <InvoiceImagePreview image={imageState.blob} />
          <h1 className='mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-xl font-medium text-transparent'>
            IS THIS THE CORRECT PHOTO...?!
          </h1>
          <p className='mx-auto text-base leading-relaxed lg:w-2/3'>
            Carefully analyze the uploaded receipt. <br />
            If everything is okay, proceed to the next step.
          </p>

          <form className='my-5'>
            <input
              type='file'
              name='file'
              className='file-input file-input-bordered w-full max-w-xs'
              title='Upload a receipt.'
              onChange={handleImageUpload}
            />
            <button
              type='submit'
              title='Submit'
              className='hidden'
            />
          </form>

          {AlertNotification({imageBlob: imageState.blob}) == undefined ? (
            <form className='flex flex-col flex-nowrap'>
              <button
                className='btn btn-primary mx-auto mt-4'
                type='button'
                onClick={async () => {
                  const base64 = await extractBase64FromBlob(imageState.blob as Blob);
                  const response = await uploadInvoice(base64);
                  console.log(response);
                }}>
                Continue to the next step
              </button>
              <button
                className='btn btn-secondary mx-auto mt-4'
                type='button'
                onClick={() => setImageState({blob: undefined, identifier: "", status: "NOT_UPLOADED"})}>
                Clear the image
              </button>
            </form>
          ) : (
            <AlertNotification imageBlob={imageState.blob} />
          )}
        </section>
      );

    case "SERVER_SIDE_UPLOAD":
      return (
        <section className='mx-auto flex flex-col items-center'>
          <div className='mb-6 w-full px-4 sm:p-4'>
            <h1 className='mb-2 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-center text-3xl font-medium text-transparent'>
              Invoice was uploaded successfully! 🪄
            </h1>
            <p className='text-center leading-relaxed'>
              Head over to the generated invoice page to view the full details of the analysis. <br />
              Please bear in mind that the analysis may take up to 3 minutes to complete.
            </p>
            <br />
            <p className='text-center leading-relaxed'>
              Thank you for using our service! 🎊🎊
              <br />
              <small>
                Invoice identifier: <em>{imageState.identifier}</em>
              </small>
            </p>
          </div>
          <div className='flex w-full flex-row items-center justify-center gap-4 p-4 sm:w-1/2 lg:w-1/4'>
            <Link
              href='./create-invoice'
              className='btn btn-secondary'
              onClick={() => setImageState({blob: undefined, identifier: "", status: "NOT_UPLOADED"})}>
              Upload another invoice
            </Link>
            <Link
              href={`./view-invoice/${imageState.identifier}`}
              className='btn btn-primary'>
              View analysis
            </Link>
          </div>
        </section>
      );

    default:
      return;
  }
}
