/** @format */

type Props = {
  image?: Blob | null;
  uploadStatus?: "SUCCESS" | "PENDING" | null;
  resetState?: () => void;
  handleImageClientSideUpload?: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleImageServerSideUpload?: (event: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
};

export default function InvoiceSubmitForm(props: Readonly<Props>) {
  const {image, uploadStatus, resetState, handleImageClientSideUpload, handleImageServerSideUpload} = props;

  if (image === null) return <ClientSideUpload handleImageClientSideUpload={handleImageClientSideUpload} />;
  return (
    <ServerSideUpload
      uploadStatus={uploadStatus}
      handleImageServerSideUpload={handleImageServerSideUpload}
      resetState={resetState}
    />
  );
}

function ClientSideUpload(props: Readonly<Props>) {
  const {handleImageClientSideUpload} = props;
  return (
    <form className='my-5'>
      <input
        type='file'
        name='file-upload'
        className='file-input file-input-bordered file-input-primary w-full max-w-xs bg-white dark:bg-black'
        title='Upload a receipt to the platform.'
        accept='image/jpeg, image/jpg, image/png, application/pdf'
        capture='environment'
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

function ServerSideUpload(props: Readonly<Props>) {
  const {uploadStatus, handleImageServerSideUpload, resetState} = props;
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
}
