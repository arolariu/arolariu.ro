/** @format */

type Props = {images: Blob[]};

/**
 * The subtitle for the invoice upload page.
 * @returns The JSX for the invoice upload page subtitle.
 */
export default function InvoiceSubtitle({images}: Readonly<Props>) {
  const titleText: string =
    images.length === 0 ? "UPLOAD A PICTURE OF THE PAPER RECEIPT!" : "ARE THESE THE CORRECT PHOTOS...?!";

  const subtitleText: string =
    images.length === 0
      ? "Carefully photograph or scan your paper receipt. Attach the digital image from your device, here."
      : "Review the uploaded receipt photo. If it is correct, proceed to the next step.";

  return (
    <div>
      <h1 className='bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-xl text-transparent'>{titleText}</h1>
      <p className='mx-auto text-base leading-relaxed lg:w-2/3'>{subtitleText}</p>
    </div>
  );
}
