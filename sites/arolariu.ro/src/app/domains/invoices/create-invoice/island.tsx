"use client";

import InvoiceImagePreview from "@/components/domains/invoices/InvoiceImagePreview";
import AlertNotification from "@/components/domains/invoices/UploadAlertNotification";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

enum ImageStatus {
  NOT_UPLOADED,
  UPLOADED_TO_SITE,
  SENT_TO_STORAGE,
}

type ImageState = {
  blob: undefined | Blob;
  identifier: string;
  status: ImageStatus;
};

const TopBarComponent = ({ uploadIsDone }: Readonly<{ uploadIsDone: boolean }>) => {
  return (
    <div className="flex flex-wrap mx-auto mb-20 2xsm:flex-col md:flex-row">
      <div
        className={`inline-flex items-center rounded-t py-3 font-medium tracking-wider 2xsm:my-1 2xsm:w-full 2xsm:border-b-0 sm:w-auto sm:justify-start sm:px-6 md:my-0 md:w-1/2 md:border-b-2
                    ${uploadIsDone ? " border-gray-200 " : " border-indigo-500 bg-gray-100 text-indigo-500 "}`}>
        <svg
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="w-5 h-5 mr-3"
          viewBox="0 0 24 24">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        UPLOAD
      </div>
      <div
        className={`inline-flex items-center rounded-t py-3 font-medium tracking-wider 2xsm:my-1 2xsm:w-full 2xsm:border-b-0 sm:w-auto sm:justify-start sm:px-6 md:my-0 md:w-1/2 md:border-b-2
                    ${uploadIsDone ? " border-indigo-500 bg-gray-100 text-indigo-500 " : " border-gray-200 "}`}>
        <svg
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="w-5 h-5 mr-3"
          viewBox="0 0 24 24">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        ANALYSIS
      </div>
    </div>
  );
};

/**
 * This function renders the invoice upload page.
 * @returns The JSX for the invoice upload page.
 */
export default function RenderInvoiceScreen() {
  const { user } = useUser();
  const [imageState, setImageState] = useState<ImageState>({
    blob: undefined,
    identifier: "",
    status: ImageStatus.NOT_UPLOADED,
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const files = event.target.files;
    if (files && files.length > 0) {
      const image = files[0] as Blob;
      setImageState({ ...imageState, blob: image, status: ImageStatus.UPLOADED_TO_SITE });
    }
  };

  const handleImageTransport = async () => {
    setImageState({ ...imageState, identifier: "replace-me", status: ImageStatus.SENT_TO_STORAGE });
    console.log(user);
    // TODO: Step 1. Send the image to the Azure Storage account.
    // TODO: Step 2. Create a new object in the backend that represents this invoice.
    // TODO: Step 3. Call the analysis endpoint to process the newly uploaded invoice.
  };

  // Return one of the following two possible scenes:
  // 1. Upload scene - where the user will be prompted to upload a new image.
  // 2. Analysis scene - where the will has the possibility to upload a new image or view the analysed image.
  // This return is based on the state variable.
  if (imageState.status == ImageStatus.UPLOADED_TO_SITE) {
    return (
      <div className="container flex flex-col flex-wrap px-5 py-24 mx-auto">
        <TopBarComponent uploadIsDone={false} />
        <div className="container flex flex-col">
          <InvoiceImagePreview image={imageState.blob} />
          <div className="flex flex-col w-full text-center">
            <h1 className="mb-4 text-xl font-medium text-transparent title-font bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
              <strong>UPLOAD A PICTURE OF THE PAPER RECEIPT</strong>
            </h1>
            <p className="mx-auto text-base leading-relaxed lg:w-2/3">
              Carefully photograph or scan your paper receipt. <br />
              Attach the digital image from your device, here.
            </p>

            <form className="container my-5">
              <input
                type="file"
                name="file"
                className="w-full max-w-xs file-input file-input-bordered"
                title="Test"
                onChange={async () => handleImageUpload}
              />
              <button type="submit" title="Submit" className="hidden" />
            </form>
          </div>

          {AlertNotification({ imageBlob: imageState.blob }) == undefined ? (
            <div className="container flex flex-col">
              <button className="mx-auto mt-4 btn btn-primary" type="button" onClick={async () => await handleImageTransport()}>
                Continue to the next step
              </button>
              <button
                className="mx-auto mt-4 btn btn-secondary"
                type="button"
                onClick={() =>
                  setImageState({ ...imageState, blob: undefined, identifier: "", status: ImageStatus.NOT_UPLOADED })
                }>
                Clear image
              </button>
            </div>
          ) : (
            <AlertNotification imageBlob={imageState.blob} />
          )}
        </div>
      </div>
    );
  } else if (imageState.status == ImageStatus.SENT_TO_STORAGE) {
    return (
      <div className="container flex flex-col flex-wrap px-5 py-24 mx-auto">
        <TopBarComponent uploadIsDone />
        <section className="flex flex-col items-center mx-auto">
          <div className="w-full px-4 mb-6 sm:p-4">
            <h1 className="mb-2 text-3xl font-medium text-center text-transparent bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
              Invoice was uploaded successfully! 🪄
            </h1>
            <p className="leading-relaxed text-center">
              Head over to the generated invoice page to view the full details of the analysis. <br />
              Please bear in mind that the analysis may take up to 3 minutes to complete.
            </p>
            <br />
            <p className="leading-relaxed text-center">
              Thank you for using our service! 🎊🎊
              <br />
              <small>
                Invoice identifier: <em>{imageState.identifier}</em>
              </small>
            </p>
          </div>
          <div className="flex flex-row items-center justify-center w-full gap-4 p-4 sm:w-1/2 lg:w-1/4">
            <Link
              href="./create-invoice"
              className="btn btn-secondary"
              onClick={() =>
                setImageState({ ...imageState, blob: undefined, identifier: "", status: ImageStatus.NOT_UPLOADED })
              }>
              Upload another invoice
            </Link>
            <Link href={`./view-invoice/${imageState.identifier}`} className="btn btn-primary">
              View analysis
            </Link>
          </div>
        </section>
      </div>
    );
  } else {
    return (
      <div className="container flex flex-col flex-wrap px-5 py-24 mx-auto">
        <TopBarComponent uploadIsDone={false} />
        <div className="container flex flex-col">
          <InvoiceImagePreview image={imageState.blob} />
          <div className="flex flex-col w-full text-center">
            <h1 className="mb-4 text-xl font-medium text-transparent title-font bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text">
              <strong>UPLOAD A PICTURE OF THE PAPER RECEIPT</strong>
            </h1>
            <p className="mx-auto text-base leading-relaxed lg:w-2/3">
              Carefully photograph or scan your paper receipt. <br />
              Attach the digital image from your device, here.
            </p>

            <form className="container my-5">
              <input
                type="file"
                name="file"
                className="w-full max-w-xs bg-white file-input file-input-bordered dark:bg-black"
                title="Test"
                onChange={() => handleImageUpload}
              />
              <button type="submit" title="Submit" className="hidden" />
            </form>
          </div>
        </div>
      </div>
    );
  }
}
