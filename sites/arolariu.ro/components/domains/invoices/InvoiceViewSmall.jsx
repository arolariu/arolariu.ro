import Link from "next/link";

export default function InvoiceViewSmall() {
  return (
    <div className="lg:w-1/4 md:w-1/2 p-4 w-full">
      <Link href="#" className="block relative h-48 rounded overflow-hidden">
        <img
          alt="ecommerce"
          className="object-cover object-center w-full h-full block"
          src="https://dummyimage.com/420x260"
        />
      </Link>
      <div className="mt-4">
        <h3 className="dark:text-gray-500 text-xs tracking-widest title-font mb-1">
          DATE: "2020-10-12"
        </h3>
        <h2 className="text-gray-500 title-font text-base font-medium">
          Receipt from "7/11"
        </h2>
        <p className="mt-1">Total: $16.00</p>
      </div>
    </div>
  );
}
