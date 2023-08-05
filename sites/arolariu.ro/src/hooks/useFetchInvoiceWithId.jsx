import { useEffect, useState } from "react";

export default function useFetchInvoiceWithId(id) {
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    const getInvoiceInformation = async () => {
      const options = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      };
      const response = await fetch(
        `https://api.arolariu.ro/api/invoices/${id}`,
        options,
      );

      if (response.status == 200) {
        const invoice = await response.json();
        setInvoice(invoice);
      } else {
        console.log("Couldn't get invoice information for invoice: " + id);
      }
    };

    getInvoiceInformation();
  }, [id]);

  return invoice;
}
