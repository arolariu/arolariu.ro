import {faker} from "@faker-js/faker";
import type {Meta, StoryObj} from "@storybook/react";

faker.seed(42);

/**
 * GridView renders invoices as a responsive card grid with images,
 * titles, dates, amounts, and selection checkboxes.
 * Depends on `useInvoicesStore` and `useTranslations`.
 *
 * This story renders a static preview of the grid layout since the
 * component depends on Zustand store and complex context.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/GridView",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function generateMockCards(count: number) {
  return Array.from({length: count}, (_, i) => ({
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.lorem.sentence(),
    date: faker.date.recent({days: 90}).toLocaleDateString("en-US", {dateStyle: "full"}),
    amount: faker.number.float({min: 10, max: 500, fractionDigits: 2}),
    itemCount: faker.number.int({min: 1, max: 20}),
    index: i,
  }));
}

/** Preview of the grid view with 6 invoice cards. */
export const Preview: Story = {
  render: () => {
    const cards = generateMockCards(6);
    return (
      <div className='grid grid-cols-1 gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3'>
        {cards.map((card) => (
          <div
            key={card.id}
            className='relative overflow-hidden rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900'>
            <div className='relative h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'>
              <div className='absolute top-2 left-2'>
                <input
                  type='checkbox'
                  className='rounded'
                />
              </div>
              <div className='flex h-full items-center justify-center text-4xl'>🧾</div>
            </div>
            <div className='p-4'>
              <h4 className='font-semibold'>{card.name}</h4>
              <p className='text-sm text-gray-500'>{card.description}</p>
              <div className='mt-3 flex items-center justify-between text-sm'>
                <span className='text-gray-500'>📅 {card.date}</span>
                <span className='font-bold'>{card.amount.toFixed(2)} RON</span>
              </div>
              <div className='mt-2 text-xs text-gray-400'>{card.itemCount} items</div>
            </div>
          </div>
        ))}
      </div>
    );
  },
};

/** Empty state — no invoices available. */
export const EmptyState: Story = {
  render: () => (
    <div className='flex items-center justify-center p-12'>
      <div className='text-center text-gray-500'>
        <p className='text-lg'>No invoices found</p>
      </div>
    </div>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  render: Preview.render,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  render: Preview.render,
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
