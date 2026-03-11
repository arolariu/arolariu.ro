import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../messages/en.json";

/**
 * ScanSelectionToolbar appears when scans are selected, providing bulk
 * actions like creating invoices. Depends on `useScans` hook.
 *
 * This story renders a static preview of the selection toolbar.
 */
const meta = {
  title: "Invoices/ViewScans/ScanSelectionToolbar",
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

/** Single scan selected. */
export const SingleSelected: Story = {
  render: () => (
    <div className="border-b bg-white px-4 py-3 shadow-sm dark:bg-gray-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">1 selected</span>
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
            ✕ Clear
          </button>
        </div>
        <button
          type="button"
          className="rounded-md bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm text-white hover:from-green-700 hover:to-emerald-700">
          📄 Create Invoice
        </button>
      </div>
    </div>
  ),
};

/** Multiple scans selected. */
export const MultipleSelected: Story = {
  render: () => (
    <div className="border-b bg-white px-4 py-3 shadow-sm dark:bg-gray-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">5 selected</span>
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-700">
            ✕ Clear
          </button>
        </div>
        <button
          type="button"
          className="rounded-md bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-2 text-sm text-white hover:from-green-700 hover:to-emerald-700">
          📄 Create Invoices
        </button>
      </div>
    </div>
  ),
};
