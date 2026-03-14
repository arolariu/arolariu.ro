import type {Meta, StoryObj} from "@storybook/react";

/**
 * MerchantInfoCard displays merchant details: name, address, phone, category,
 * and website. Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the merchant info card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Cards/MerchantInfo",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Full merchant info with website. */
export const WithWebsite: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='text-lg font-semibold'>Kaufland</h3>
      </div>
      <div className='space-y-3 p-4'>
        <div className='flex items-start gap-2 text-sm'>
          <span className='mt-0.5 text-gray-400'>📍</span>
          <span>Calea Victoriei 123, Sector 1, Bucharest</span>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-gray-400'>📞</span>
          <span>+40 21 123 4567</span>
        </div>
        <div>
          <span className='rounded-full border px-2 py-0.5 text-xs'>SUPERMARKET</span>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-gray-400'>🌐</span>
          <a
            href='#'
            className='text-blue-600 hover:underline dark:text-blue-400'>
            kaufland.ro
          </a>
        </div>
      </div>
      <div className='border-t p-4'>
        <button
          type='button'
          className='w-full rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600'>
          View All Receipts
        </button>
      </div>
    </div>
  ),
};

/** Merchant without website. */
export const WithoutWebsite: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='text-lg font-semibold'>Local Bakery</h3>
      </div>
      <div className='space-y-3 p-4'>
        <div className='flex items-start gap-2 text-sm'>
          <span className='mt-0.5 text-gray-400'>📍</span>
          <span>Str. Lipscani 42, Bucharest</span>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-gray-400'>📞</span>
          <span>+40 21 987 6543</span>
        </div>
        <div>
          <span className='rounded-full border px-2 py-0.5 text-xs'>BAKERY</span>
        </div>
      </div>
      <div className='border-t p-4'>
        <button
          type='button'
          className='w-full rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600'>
          View All Receipts
        </button>
      </div>
    </div>
  ),
};

/** Merchant with a logo image. */
export const WithLogo: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <div className='flex items-center gap-3'>
          <img
            src='https://picsum.photos/64/64'
            alt='Merchant logo'
            className='h-10 w-10 rounded-full object-cover'
          />
          <h3 className='text-lg font-semibold'>Kaufland</h3>
        </div>
      </div>
      <div className='space-y-3 p-4'>
        <div className='flex items-start gap-2 text-sm'>
          <span className='mt-0.5 text-gray-400'>📍</span>
          <span>Calea Victoriei 123, Sector 1, Bucharest</span>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-gray-400'>📞</span>
          <span>+40 21 123 4567</span>
        </div>
        <div>
          <span className='rounded-full border px-2 py-0.5 text-xs'>SUPERMARKET</span>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-gray-400'>🌐</span>
          <a
            href='#'
            className='text-blue-600 hover:underline dark:text-blue-400'>
            kaufland.ro
          </a>
        </div>
      </div>
      <div className='border-t p-4'>
        <button
          type='button'
          className='w-full rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600'>
          View All Receipts
        </button>
      </div>
    </div>
  ),
};

/** Merchant with a very long name to test text overflow and wrapping. */
export const LongMerchantName: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='text-lg font-semibold'>
          Mega Image Supermarket International Premium Gold Deluxe Extra — Downtown Central Branch Nr. 42
        </h3>
      </div>
      <div className='space-y-3 p-4'>
        <div className='flex items-start gap-2 text-sm'>
          <span className='mt-0.5 text-gray-400'>📍</span>
          <span>Bulevardul Decebal Nr. 123, Bloc A4, Scara 2, Etaj 1, Apartament 42, Sector 3, Bucharest, 030167, Romania</span>
        </div>
        <div className='flex items-center gap-2 text-sm'>
          <span className='text-gray-400'>📞</span>
          <span>+40 21 123 4567</span>
        </div>
        <div>
          <span className='rounded-full border px-2 py-0.5 text-xs'>SUPERMARKET</span>
        </div>
      </div>
      <div className='border-t p-4'>
        <button
          type='button'
          className='w-full rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:border-gray-600'>
          View All Receipts
        </button>
      </div>
    </div>
  ),
};
