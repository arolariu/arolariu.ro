/** @format */

import type {UploadStatus} from "@/types";

type Props = {
  images?: Blob[] | null;
  uploadStatus?: UploadStatus;
  resetState?: () => void;
  handleImageClientSideUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageServerSideUpload?: (
    event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>,
  ) => Promise<void>;
};

/**
 * This function renders the client-side upload form.
 * @returns The JSX for the client-side upload form.
 */
function ClientSideUpload(props: Readonly<Props>) {
  const {handleImageClientSideUpload} = props;
  return (
    <form className='my-5'>
      <input
        multiple
        type='file'
        name='file-upload'
        className='file-input file-input-bordered file-input-primary w-full max-w-xs bg-white dark:bg-black'
        title='Upload a receipt to the platform.'
        accept='image/jpeg, image/jpg, image/png, application/pdf'
        onChange={handleImageClientSideUpload}
      />
      <button
        type='submit'
        title='Submit button.'
        className='hidden'
      />
    </form>
  );
}

/**
 * This function renders the server-side upload form.
 * @returns The JSX for the server-side upload form.
 */
function ServerSideUpload(props: Readonly<Props>) {
  const {uploadStatus, handleImageServerSideUpload, resetState} = props;
  return (
    <form className='flex flex-col flex-nowrap'>
      <button
        className='btn btn-primary mx-auto mt-4'
        type='button'
        disabled={uploadStatus === "PENDING__SERVERSIDE"}
        onClick={handleImageServerSideUpload}>
        Continue to the next step
      </button>
      <button
        className='btn btn-secondary mx-auto mt-4'
        type='button'
        disabled={uploadStatus === "PENDING__SERVERSIDE"}
        onClick={resetState}>
        Clear the image
      </button>
    </form>
  );
}

/**
 * This function renders the invoice submit form.
 * @returns The JSX for the invoice submit form.
 */
export default function InvoiceSubmitForm(props: Readonly<Props>) {
  const {images, uploadStatus, resetState, handleImageClientSideUpload, handleImageServerSideUpload} = props;
  const imagesLength = images?.length;

  if (imagesLength === 0) return <ClientSideUpload handleImageClientSideUpload={handleImageClientSideUpload} />;
  return (
    <ServerSideUpload
      uploadStatus={uploadStatus}
      handleImageServerSideUpload={handleImageServerSideUpload}
      resetState={resetState}
    />
  );
}
