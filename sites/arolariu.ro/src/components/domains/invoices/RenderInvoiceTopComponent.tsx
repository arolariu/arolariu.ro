"use client";

import InvoicePageTopSVG from "@/assets/InvoicePageTopSVG";
import Link from "next/link";

export default function RenderInvoiceTopComponent() {
  return (
    <section className="dark:text-gray-200">
      <div className="container flex flex-col items-center justify-center px-5 py-24 mx-auto">
        <InvoicePageTopSVG className="object-cover object-center" />
        <div className="w-full mt-2 text-center lg:w-2/3">
          <h1 className="mb-4 text-3xl font-medium text-transparent title-font bg-gradient-to-r from-pink-400 to-red-600 bg-clip-text sm:text-4xl">
            Turn your paper receipts into powerful digital knowledge.
          </h1>
          <p className="mb-8 leading-relaxed">
            Receipts are great for keeping your own accounting. However, what if
            you could upload these receipts somewhere, and get powerful insights
            into your habits? What if you could automatically get a list of all
            the products you bought in the last year? <br />
            <br />
            Unleash the power of our platform!
            <br />
            Throw away the Excel tables and hop on the digital train now!
          </p>
          <div className="flex justify-center">
            <Link
              href="/domains/invoices/create-invoice"
              className="inline-flex px-6 py-2 text-lg text-white bg-indigo-500 border-0 rounded hover:bg-indigo-600 focus:outline-none"
            >
              Upload receipt
            </Link>
            <Link
              href="/domains/invoices/view-invoices"
              className="inline-flex px-6 py-2 ml-4 text-lg text-gray-700 bg-gray-100 border-0 rounded hover:bg-gray-200 focus:outline-none"
            >
              My receipts
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
