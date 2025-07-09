/** @format */

import {useInvoiceCreator} from "../_context/InvoiceCreatorContext";
import {useInvoiceActions} from "../_hooks/useInvoiceActions";

/**
 * This function renders the client-side upload form.
 * @returns The JSX for the client-side upload form.
 */
function ClientSideUpload() {
  const {handleImageClientSideUpload} = useInvoiceActions();
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
function ServerSideUpload() {
  const {uploadStatus} = useInvoiceCreator();
  const {handleImageServerSideUpload, resetState, handleImageClientSideUpload} = useInvoiceActions();
  return (
    <form className='flex flex-col flex-nowrap'>
      <div className='mx-auto my-5'>
        <label
          htmlFor='file-upload-more'
          className='btn btn-accent'>
          Add more files
        </label>
        <input
          multiple
          id='file-upload-more'
          type='file'
          name='file-upload-more'
          className='hidden'
          title='Upload more receipts to the platform.'
          accept='image/jpeg, image/jpg, image/png, application/pdf'
          onChange={handleImageClientSideUpload}
        />
      </div>
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
        Clear all images
      </button>
    </form>
  );
}

/**
 * This function renders the invoice submit form.
 * @returns The JSX for the invoice submit form.
 */
export default function InvoiceSubmitForm() {
  const {scans} = useInvoiceCreator();
  const scansLength = scans.length;
  return scansLength === 0 ? <ClientSideUpload /> : <ServerSideUpload />;
}
