import type {Meta, StoryObj} from "@storybook/react";
import {ScrollToTop} from "./useScrollToTop";

/**
 * The ScrollToTop component displays an animated floating action button (FAB)
 * that scrolls to the top of the page. It appears when the user scrolls past
 * 500px and uses Framer Motion for smooth entrance/exit animations.
 *
 * This story wraps the component with tall content to trigger the scroll threshold.
 */
const meta = {
  title: "Site/ScrollToTop",
  component: ScrollToTop,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ScrollToTop>;

export default meta;
type Story = StoryObj<typeof meta>;

/** ScrollToTop rendered within tall content — scroll down to see the FAB. */
export const Default: Story = {
  render: () => (
    <div className='relative'>
      <div className='bg-gradient-to-b from-blue-50 to-white p-8 dark:from-gray-900 dark:to-gray-950'>
        <h1 className='mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100'>Scroll Down to See the Button</h1>
        <p className='mb-8 text-gray-600 dark:text-gray-400'>The ScrollToTop FAB appears after scrolling 500px. Try scrolling down!</p>
        {Array.from({length: 20}, (_, i) => (
          <div
            key={`section-${String(i)}`}
            className='mb-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800'>
            <h2 className='mb-2 font-semibold text-gray-900 dark:text-gray-100'>Section {i + 1}</h2>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque in ipsum id orci porta dapibus.
            </p>
          </div>
        ))}
      </div>
      <ScrollToTop />
    </div>
  ),
};

/** Static preview of the FAB button style (always visible). */
export const AlwaysVisible: Story = {
  render: () => (
    <div className='flex min-h-[200px] items-center justify-center'>
      <button
        type='button'
        className='flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-transform hover:scale-110 active:scale-90'
        aria-label='Scroll to top'>
        <svg
          className='h-5 w-5'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M5 15l7-7 7 7'
          />
        </svg>
      </button>
    </div>
  ),
};
