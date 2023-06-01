import React from "react";

type SubmitInvoiceButtonProps = {
  imageUrl: string;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function SubmitInvoiceButton({
  imageUrl,
  handleFileChange,
}: SubmitInvoiceButtonProps) {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await fetch("https://localhost:32770/api/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "*/*",
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
      }),
    }).then((response) => {
      console.log(response.body);
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="file-input" className="block mb-4 text-center">
        Select an invoice file to submit
      </label>
      <input
        id="file-input"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        className="block px-4 py-2 mx-auto mb-4 text-white bg-blue-500 rounded-md"
      />
      <button
        type="submit"
        className="block px-4 py-2 mx-auto text-white bg-blue-500 rounded-md"
      >
        Analyze Invoice
      </button>
    </form>
  );
}
