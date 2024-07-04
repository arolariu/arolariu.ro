/** @format */

/**
 * This component is used to display a call to action for the invoice creation process.
 * @returns The JSX for the invoice call to action.
 */
export default function InvoiceCallToAction({image}: Readonly<{image: Blob | null}>) {
  const imageIsNull = image === null;
  const ctaText = imageIsNull
    ? "Carefully photograph or scan your paper receipt. Attach the digital image from your device, here."
    : "Review the uploaded receipt photo. If it is correct, proceed to the next step.";

  return (
    <>
      <h1 className='mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-xl font-medium text-transparent'>
        {imageIsNull ? "IS THIS THE CORRECT PHOTO...?!" : "UPLOAD A PICTURE OF THE PAPER RECEIPT"}
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
    </>
  );
}
