import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../../messages/en.json";

/**
 * InvoiceHeader (edit) renders the editable invoice header with inline name
 * editing, save, discard, print, and delete controls. Depends on
 * `useEditInvoiceContext` and `useDialog`.
 *
 * This story renders a static preview of the header layout.
 */
const meta = {
  title: "Invoices/EditInvoice/InvoiceHeader",
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview with no pending changes. */
export const NoChanges: Story = {
  render: () => (
    <div className="flex flex-col gap-3 border-b bg-white px-6 py-4 md:flex-row md:items-center md:justify-between dark:bg-gray-900">
      <div>
        <input
          type="text"
          defaultValue="Weekly Grocery Shopping"
          className="w-full border-0 bg-transparent text-3xl font-bold tracking-tight focus:outline-none"
          readOnly
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600">
          🖨 Print
        </button>
        <button
          type="button"
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">
          🗑 Delete
        </button>
      </div>
    </div>
  ),
};

/** Preview with pending changes (save/discard buttons visible). */
export const WithPendingChanges: Story = {
  render: () => (
    <div className="flex flex-col gap-3 border-b bg-white px-6 py-4 md:flex-row md:items-center md:justify-between dark:bg-gray-900">
      <div>
        <input
          type="text"
          defaultValue="Weekly Grocery Shopping (edited)"
          className="w-full border-0 bg-transparent text-3xl font-bold tracking-tight focus:outline-none"
          readOnly
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
          💾 Save
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600">
          ✕ Discard
        </button>
        <button
          type="button"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600">
          🖨 Print
        </button>
        <button
          type="button"
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">
          🗑 Delete
        </button>
      </div>
    </div>
  ),
};
