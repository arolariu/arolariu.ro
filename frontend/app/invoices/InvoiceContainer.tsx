import { useState } from "react";
import InvoicePreview from "./InvoicePreview";
import SubmitInvoiceButton from "./SubmitInvoiceButton";

export default function InvoiceContainer() {
  const [imageUrl, setImageUrl] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setImageUrl("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <InvoicePreview imageUrl={imageUrl} />
      <SubmitInvoiceButton
        imageUrl={imageUrl}
        handleFileChange={handleFileChange}
      />
    </div>
  );
}
