import type {Meta, StoryObj} from "@storybook/react";

/**
 * Static visual preview of the ImageDialog component.
 *
 * The actual component depends on `useDialog` context with a payload URL,
 * so this story renders a faithful HTML replica of the full-width dialog
 * with a receipt image placeholder.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/ImageDialog",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default image dialog with receipt placeholder. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Receipt Image</h2>
      </div>
      <div className='relative flex aspect-[3/4] max-h-[500px] items-center justify-center bg-gray-50 dark:bg-gray-800'>
        <img src='https://picsum.photos/seed/imagedialog/600/800' alt='Receipt scan preview' className='h-full w-full object-contain' />
      </div>
    </div>
  ),
};
