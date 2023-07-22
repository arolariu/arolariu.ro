import InvoiceViewSmall from "@/components/domains/invoices/InvoiceViewSmall";

export default function ListInvoicesPage() {
  return (
    <section className="dark:text-gray-300">
      <div className="container px-5 py-24 mx-auto">
        <div className="flex flex-wrap -m-4">
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
          <InvoiceViewSmall />
        </div>
      </div>
    </section>
  );
}
