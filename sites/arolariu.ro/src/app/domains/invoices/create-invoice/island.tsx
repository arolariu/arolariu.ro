"use client";

import {useState} from "react";
import {InvoiceClientSideUpload, InvoiceNotUploaded, InvoiceServerSideUpload} from "./_components/InvoiceStates";

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
      return <InvoiceNotUploaded handleImageUpload={handleImageUpload} />;

    case "CLIENT_SIDE_UPLOAD":
      return (
        <InvoiceClientSideUpload
          blob={imageState.blob}
          handleImageUpload={handleImageUpload}
          setImageState={setImageState}
        />
      );

    case "SERVER_SIDE_UPLOAD":
      return (
        <InvoiceServerSideUpload
          identifier={imageState.identifier}
          setImageState={setImageState}
        />
      );
  }
}
