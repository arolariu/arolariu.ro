import type {Meta, StoryObj} from "@storybook/react";
import {TbStar} from "react-icons/tb";

/**
 * Static visual preview of the FeedbackDialog component.
 *
 * The actual component depends on `useDialog` context with invoice/merchant
 * payload, so this story renders a faithful HTML replica of the feedback
 * form with star rating, feature badges, and textarea.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/FeedbackDialog",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default feedback dialog with empty form. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Analytics Feedback</h2>
        <p className='mt-1 text-sm text-gray-500'>How was the analytics experience for Lidl?</p>
      </div>

      <div className='space-y-5 p-6'>
        {/* Star Rating */}
        <div>
          <h4 className='mb-2 text-sm font-medium'>Rate the analytics</h4>
          <div className='flex gap-1'>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className='p-1'>
                <TbStar className={`h-6 w-6 ${star <= 3 ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
              </button>
            ))}
          </div>
        </div>

        {/* Feature Selection */}
        <div>
          <h4 className='mb-2 text-sm font-medium'>Which features were most helpful?</h4>
          <div className='flex flex-wrap gap-2'>
            {["Spending Trends", "Price Comparisons", "Savings Tips", "Merchant Analysis", "Visual Charts", "Category Breakdown"].map(
              (feature) => (
                <span
                  key={feature}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                    feature === "Spending Trends" || feature === "Visual Charts"
                      ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                      : ""
                  }`}>
                  {feature}
                </span>
              ),
            )}
          </div>
        </div>

        {/* Comments */}
        <div>
          <h4 className='mb-2 text-sm font-medium'>Additional comments</h4>
          <textarea
            className='w-full rounded-md border bg-transparent p-3 text-sm outline-none'
            rows={4}
            placeholder='Tell us what you think about the analytics features...'
            readOnly
          />
        </div>
      </div>

      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
          Submit Feedback
        </button>
      </div>
    </div>
  ),
};

/** With 5-star rating selected. */
export const HighRating: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Analytics Feedback</h2>
        <p className='mt-1 text-sm text-gray-500'>How was the analytics experience for Amazon?</p>
      </div>
      <div className='space-y-5 p-6'>
        <div>
          <h4 className='mb-2 text-sm font-medium'>Rate the analytics</h4>
          <div className='flex gap-1'>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className='p-1'>
                <TbStar className='h-6 w-6 fill-yellow-400 text-yellow-400' />
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
          Submit Feedback
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
