interface Props {
  imageBlob: undefined | Blob;
}

/**
 * This function renders the alert notification.
 * @returns The JSX for the alert notification.
 */
export default function AlertNotification({ imageBlob }: Readonly<Props>) {
  if (!imageBlob) return;

  const allowedFormats = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  return allowedFormats.includes(imageBlob.type) ? undefined
    : <div className="container alert alert-error mx-auto mt-8 flex w-1/2 flex-col opacity-100 transition-opacity duration-1000 ease-in">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 stroke-current shrink-0"
        fill="none"
        viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="text-center">Error! Currently, we only accept receipts that have been saved as either:</span>
      <ol>
        <li>
          1. <strong>JPG / JPEG</strong> format.
        </li>
        <li>
          2. <strong>PNG</strong> format.
        </li>
        <li>
          3. <strong>PDF</strong> format.
        </li>
      </ol>
      <span>Please upload a new digital scan of your physical receipt.</span>
    </div>
}
