import type {Meta, StoryObj} from "@storybook/react";
import {TbBuilding, TbBuildingStore, TbMapPin, TbPhone} from "react-icons/tb";

/**
 * Static visual preview of the MerchantDialog component.
 *
 * The actual component depends on `useDialog` context with merchant payload,
 * so this story renders a faithful HTML replica of the merchant details view
 * with profile header and details table.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MerchantDialog",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-xl p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default merchant details dialog. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Merchant Details</h2>
        <p className='mt-1 text-sm text-gray-500'>Detailed information about Lidl</p>
      </div>

      <div className='space-y-4 p-6'>
        {/* Merchant Profile */}
        <div className='flex items-center gap-3'>
          <div className='flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30'>
            <TbBuilding className='h-6 w-6 text-purple-600 dark:text-purple-400' />
          </div>
          <div>
            <h3 className='text-lg font-semibold'>Lidl</h3>
            <span className='rounded-full border px-2 py-0.5 text-xs text-gray-500'>Grocery</span>
          </div>
        </div>

        {/* Details Table */}
        <table className='w-full'>
          <tbody className='divide-y dark:divide-gray-700'>
            <tr>
              <td className='py-2'>
                <div className='flex items-center gap-2'>
                  <TbMapPin className='h-4 w-4 text-gray-400' />
                  <span className='text-sm font-medium text-gray-500'>Address</span>
                </div>
              </td>
              <td className='py-2 text-sm'>Str. Mihai Eminescu Nr. 42, Bucharest</td>
            </tr>
            <tr>
              <td className='py-2'>
                <div className='flex items-center gap-2'>
                  <TbPhone className='h-4 w-4 text-gray-400' />
                  <span className='text-sm font-medium text-gray-500'>Phone</span>
                </div>
              </td>
              <td className='py-2 text-sm'>+40 21 123 4567</td>
            </tr>
            <tr>
              <td className='py-2'>
                <div className='flex items-center gap-2'>
                  <TbBuildingStore className='h-4 w-4 text-gray-400' />
                  <span className='text-sm font-medium text-gray-500'>Parent Company</span>
                </div>
              </td>
              <td className='py-2 text-sm'>Schwarz Group</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className='border-t p-4'>
        <button className='w-full rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
          Open in Maps
        </button>
      </div>
    </div>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  ...Default,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
