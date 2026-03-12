import type {Meta, StoryObj} from "@storybook/react";

/**
 * ShareAnalyticsDialog renders a tabbed sharing dialog with image and email options.
 *
 * @remarks Static preview — component destructures `{invoice}` from `useDialog()` payload
 * which is null when the dialog is closed, causing a runtime crash. The dialog can only
 * render when opened programmatically via the DialogContext.
 */
const meta = {
  title: "Invoices/ViewInvoice/Dialogs/ShareAnalyticsDialog",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static preview of the share analytics dialog layout. */
export const Default: Story = {
  render: () => (
    <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-lg dark:bg-gray-900">
      <h2 className="mb-4 text-lg font-semibold">Share Analytics</h2>
      <div className="mb-4 flex gap-2">
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-white">Image</button>
        <button className="rounded-md bg-gray-100 px-4 py-2 text-sm dark:bg-gray-800">Email</button>
      </div>
      <div className="rounded border p-4 text-center text-sm text-gray-500">
        Analytics snapshot will be generated here
      </div>
    </div>
  ),
};
