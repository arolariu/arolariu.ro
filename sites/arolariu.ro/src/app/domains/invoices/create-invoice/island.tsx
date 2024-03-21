"use client";

import InvoiceImagePreview from "@/components/domains/invoices/InvoiceImagePreview";
import AlertNotification from "@/components/domains/invoices/UploadAlertNotification";
import uploadInvoice from "@/lib/invoices/uploadInvoice";
import Link from "next/link";
import { useState } from "react";

type ImageState = {
  blob: undefined | Blob;
  identifier: string;
  status: "NOT_UPLOADED" | "CLIENT_SIDE_UPLOAD" | "SERVER_SIDE_UPLOAD"
};

/**
 * This function renders the invoice upload page.
 * @returns The JSX for the invoice upload page.
 */
export default function RenderInvoiceScreen() {
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
      setImageState({ ...imageState, blob: image, status: "CLIENT_SIDE_UPLOAD" });
    }
  };

  const handleImageTransport = async () => {
    const response = await uploadInvoice({ image: imageState.blob });
    const { identifier, status } = response;

    if (status === "SUCCESS") {
      setImageState({ ...imageState, identifier, status: "SERVER_SIDE_UPLOAD" });
    } else {
      setImageState({ ...imageState, status: "NOT_UPLOADED" });
      console.error("Error uploading the image to the server: ", response.message);
    }
  };

  switch (imageState.status) {
    case "NOT_UPLOADED":
      return (
        <div className="container flex flex-col flex-wrap px-5 py-24 mx-auto">
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
                  onChange={handleImageUpload}
                />
                <button type="submit" title="Submit" className="hidden" />
              </form>
            </div>
          </div>
        </div>);

    case "CLIENT_SIDE_UPLOAD":
      return (
        <div className="container flex flex-col flex-wrap px-5 py-24 mx-auto">
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

    case "SERVER_SIDE_UPLOAD":
      return (
        <div className="container flex flex-col flex-wrap px-5 py-24 mx-auto">
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

    default:
      return;

  }
}
