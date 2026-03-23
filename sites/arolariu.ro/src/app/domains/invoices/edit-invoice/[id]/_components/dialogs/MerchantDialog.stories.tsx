import type {Meta, StoryObj} from "@storybook/react";

/**
 * MerchantDialog renders merchant details view.
 *
 * @remarks Static preview — component destructures `payload.category` from `useDialog()`
 * which is null when the dialog is closed, causing a runtime crash. The dialog can only
 * render when opened programmatically via the DialogContext.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MerchantDialog",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Static preview of the merchant dialog layout. */
export const Default: Story = {
  render: () => (
    <div className='w-full max-w-lg rounded-lg border bg-white p-6 shadow-lg dark:bg-gray-900'>
      <h2 className='mb-4 text-lg font-semibold'>Merchant Details</h2>
      <div className='space-y-3'>
        <div className='flex items-center gap-3'>
          <div className='bg-primary/10 flex h-12 w-12 items-center justify-center rounded-full text-xl'>🏪</div>
          <div>
            <p className='font-medium'>Kaufland Romania</p>
            <span className='rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700'>Grocery</span>
          </div>
        </div>
        <div className='text-sm text-gray-500'>
          <p>📍 Str. Victoriei 12, Bucharest</p>
          <p>📱 +40 21 123 4567</p>
        </div>
      </div>
    </div>
  ),
};
