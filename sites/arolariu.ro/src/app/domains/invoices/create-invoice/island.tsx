/** @format */

"use client";

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {ToastAction} from "@/components/ui/toast";
import {useToast} from "@/components/ui/use-toast";
import {useRouter} from "next/navigation";
import {useState} from "react";
import InvoicePreview from "./_components/InvoicePreview";

/**
 * This function renders the invoice upload page.
 * @returns The JSX for the invoice upload page.
 */
export default function RenderCreateInvoiceScreen() {
  const {toast} = useToast();
  const router = useRouter();
  const [image, setImage] = useState<Blob | null>(null);
  const [isValidMimeType, setIsValidMimeType] = useState<boolean | null>(null);
  const validMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "application/pdf"]);

  const ctaText =
    isValidMimeType === true
      ? "Review the uploaded receipt photo. If it is correct, proceed to the next step."
      : "Carefully photograph or scan your paper receipt. Attach the digital image from your device, here.";

  const handleImageClientSideUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const {files} = event.target;
    if (files && files.length > 0) {
      const image = files[0] as Blob;
      const isValidMimeType = validMimeTypes.has(image.type);
      setImage(isValidMimeType ? image : null);
      setIsValidMimeType(isValidMimeType);
    }
  };

  const handleImageServerSideUpload = async () => {
    console.log(image);

    // TODO: completet this action + toast router push page.
    setImage(null);
    setIsValidMimeType(null);

    toast({
      variant: "destructive",
      title: "Receipt uploaded successfully!",
      duration: 5000,
      action: (
        <ToastAction
          altText='Navigate to receipt.'
          onClick={() => router.push("/domains/invoices/view-invoice")}>
          Navigate to receipt.
        </ToastAction>
      ),
    });
  };

  return (
    <section className='h-full w-full'>
      <InvoicePreview image={image} />
      <h1 className='mb-4 bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text text-xl font-medium text-transparent'>
        {isValidMimeType === true ? "IS THIS THE CORRECT PHOTO...?!" : "UPLOAD A PICTURE OF THE PAPER RECEIPT"}
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

      {isValidMimeType !== true && (
        <form className='my-5'>
          <input
            type='file'
            name='file-upload'
            className='file-input file-input-bordered file-input-primary w-full max-w-xs bg-white dark:bg-black'
            title='Upload a receipt to the platform.'
            onChange={handleImageClientSideUpload}
          />
          <button
            type='submit'
            title='Submit button.'
            className='hidden'
          />
        </form>
      )}

      {isValidMimeType === false && (
        <section className='alert alert-warning mx-auto flex w-1/2 flex-col items-center justify-center justify-items-center'>
          <article className='text-center'>
            The uploaded file is not a valid image or PDF. Please upload a valid scan/photo or a protected document file
            (PDF) of the receipt.
          </article>
          <article className='text-start'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supported file types (extensions)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className='text-center'>
                <TableRow>
                  <TableCell>image/jpeg</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>image/jpg</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>image/png</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>application/pdf</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </article>
        </section>
      )}

      {isValidMimeType === true && (
        <form className='flex flex-col flex-nowrap'>
          <button
            className='btn btn-primary mx-auto mt-4'
            type='button'
            onClick={handleImageServerSideUpload}>
            Continue to the next step
          </button>
          <button
            className='btn btn-secondary mx-auto mt-4'
            type='button'
            onClick={() => {
              setImage(null);
              setIsValidMimeType(null);
            }}>
            Clear the image
          </button>
        </form>
      )}
    </section>
  );
}
