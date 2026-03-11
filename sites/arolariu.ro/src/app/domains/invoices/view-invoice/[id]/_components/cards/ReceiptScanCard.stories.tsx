import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../../../messages/en.json";

/**
 * ReceiptScanCard shows receipt images with navigation, zoom dialog, and
 * previous/next controls. Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the receipt scan card.
 */
const meta = {
  title: "Invoices/ViewInvoice/ReceiptScanCard",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <div className="max-w-sm">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Single scan card. */
export const SingleScan: Story = {
  render: () => (
    <div className="rounded-lg border bg-white shadow-sm dark:bg-gray-900">
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold">Receipt Scan</h3>
      </div>
      <div className="flex justify-center p-4">
        <div className="h-[250px] w-[170px] cursor-pointer overflow-hidden rounded-md border bg-gray-100 dark:bg-gray-800">
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            📷 Receipt
          </div>
        </div>
      </div>
      <div className="border-t p-4">
        <button
          type="button"
          className="w-full rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600">
          🔍 Expand
        </button>
      </div>
    </div>
  ),
};

/** Multiple scans with navigation. */
export const MultipleScans: Story = {
  render: () => (
    <div className="rounded-lg border bg-white shadow-sm dark:bg-gray-900">
      <div className="border-b p-4">
        <h3 className="text-lg font-semibold">Receipt Scan (1/3)</h3>
      </div>
      <div className="flex justify-center p-4">
        <div className="h-[250px] w-[170px] cursor-pointer overflow-hidden rounded-md border bg-gray-100 dark:bg-gray-800">
          <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
            📷 Scan 1 of 3
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t p-4">
        <button
          type="button"
          className="w-full rounded-md border px-4 py-2 text-sm dark:border-gray-600">
          🔍 Expand
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            disabled
            className="flex-1 rounded-md border px-3 py-2 text-sm opacity-50 dark:border-gray-600">
            Previous
          </button>
          <button
            type="button"
            className="flex-1 rounded-md border px-3 py-2 text-sm dark:border-gray-600">
            Next
          </button>
        </div>
      </div>
    </div>
  ),
};
