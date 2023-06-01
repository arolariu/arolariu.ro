import Image from "next/image";

export default function InvoicePreview({ imageUrl }: { imageUrl: string }) {
  return (
    <>
      <div className="w-1/2 h-[90vh] mb-8 border-4 border-blue-500 align-middle justify-center justify-items-center flex">
        {imageUrl != "" && (
          <Image
            src={imageUrl}
            alt="Invoice Preview"
            width={500}
            height={500}
            className="flex my-auto"
          />
        )}
      </div>
    </>
  );
}
