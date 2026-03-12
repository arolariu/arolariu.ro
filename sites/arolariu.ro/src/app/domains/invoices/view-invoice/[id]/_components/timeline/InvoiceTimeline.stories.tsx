import type {Meta, StoryObj} from "@storybook/react";
import {TbCalendar, TbFileInvoice, TbRobot, TbShare, TbStar, TbUsers} from "react-icons/tb";

/**
 * Static visual preview of the InvoiceTimeline component.
 *
 * @remarks Static preview — component uses `useInvoice` hook which imports "use server"
 * action (fetchInvoice from `@/lib/actions/invoices/fetchInvoice`) that cannot be bundled
 * by Storybook's Vite/Rollup. Also depends on `useInvoiceContext` and `useDialog`.
 * This story renders a faithful HTML replica of the visual structure with mock timeline
 * data and sharing information.
 */
const meta = {
  title: "Invoices/Timeline/InvoiceTimeline",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-md p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default timeline with grouped events and shared users section. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-sm transition-shadow duration-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900'>
      <div className='p-6 pb-4'>
        <div className='flex items-center justify-between'>
          <h3 className='flex items-center gap-2 text-lg font-semibold'>
            <TbCalendar className='text-muted-foreground h-4 w-4' />
            Invoice Timeline
          </h3>
          <span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800'>5 events</span>
        </div>
        <p className='text-muted-foreground mt-1 text-sm'>Track all changes and actions performed on this invoice.</p>
      </div>

      <div className='space-y-6 p-6 pt-0'>
        {/* Date Group 1 */}
        <div>
          <p className='mb-2 text-xs font-medium text-gray-500'>January 15, 2025</p>
          <div className='space-y-3'>
            <div className='flex items-start gap-3'>
              <div className='mt-0.5 rounded-full bg-blue-100 p-1.5 dark:bg-blue-900/50'>
                <TbFileInvoice className='h-3.5 w-3.5 text-blue-600' />
              </div>
              <div>
                <p className='text-sm font-medium'>Invoice Created</p>
                <p className='text-xs text-gray-500'>Receipt scanned and invoice record created</p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <div className='mt-0.5 rounded-full bg-purple-100 p-1.5 dark:bg-purple-900/50'>
                <TbRobot className='h-3.5 w-3.5 text-purple-600' />
              </div>
              <div>
                <p className='text-sm font-medium'>AI Analysis Complete</p>
                <p className='text-xs text-gray-500'>12 items detected, 94% confidence</p>
              </div>
            </div>
          </div>
        </div>

        {/* Date Group 2 */}
        <div>
          <p className='mb-2 text-xs font-medium text-gray-500'>January 16, 2025</p>
          <div className='space-y-3'>
            <div className='flex items-start gap-3'>
              <div className='mt-0.5 rounded-full bg-green-100 p-1.5 dark:bg-green-900/50'>
                <TbShare className='h-3.5 w-3.5 text-green-600' />
              </div>
              <div>
                <p className='text-sm font-medium'>Invoice Shared</p>
                <p className='text-xs text-gray-500'>Shared with 2 users</p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <div className='mt-0.5 rounded-full bg-yellow-100 p-1.5 dark:bg-yellow-900/50'>
                <TbStar className='h-3.5 w-3.5 text-yellow-600' />
              </div>
              <div>
                <p className='text-sm font-medium'>Marked Important</p>
                <p className='text-xs text-gray-500'>Invoice flagged for quick access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Shared With Section */}
        <div className='border-t pt-4'>
          <div className='mb-2 flex items-center gap-2'>
            <TbUsers className='text-muted-foreground h-4 w-4' />
            <p className='text-xs font-medium text-gray-500'>Shared with</p>
            <span className='rounded-full bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800'>2</span>
          </div>
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <div className='flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600'>AB</div>
              <div>
                <p className='text-sm font-medium'>alice@example.com</p>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <div className='flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-medium text-green-600'>BC</div>
              <div>
                <p className='text-sm font-medium'>bob@example.com</p>
              </div>
            </div>
          </div>
        </div>
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
