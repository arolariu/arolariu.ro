import type {Meta, StoryObj} from "@storybook/react";
import {ThemeProvider} from "next-themes";

/**
 * The Navigation component provides both desktop and mobile navigation.
 *
 * Because Navigation depends on `useAuth` from Clerk, this story renders
 * **skeleton representations** of the desktop and mobile navigation states
 * to avoid requiring a full Clerk provider.
 */
const meta = {
  title: "Site/Navigation",
  component: undefined as never,
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute='class'
        defaultTheme='light'
        enableSystem={false}>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Desktop navigation skeleton showing nav items. */
export const DesktopSkeleton: Story = {
  render: () => (
    <nav className='flex items-center gap-6 rounded-lg border border-gray-200 px-6 py-3 dark:border-gray-700'>
      <div className='h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700' />
      <div className='h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700' />
      <div className='h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700' />
    </nav>
  ),
};

/** Mobile navigation trigger skeleton (hamburger button). */
export const MobileTriggerSkeleton: Story = {
  render: () => (
    <div className='flex items-center justify-center rounded-lg border border-gray-200 p-4 dark:border-gray-700'>
      <button
        type='button'
        className='rounded-md border border-gray-300 p-2 dark:border-gray-600'
        aria-label='Open navigation'>
        <svg
          className='h-6 w-6 text-gray-600 dark:text-gray-300'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M4 6h16M4 12h16M4 18h16'
          />
        </svg>
      </button>
    </div>
  ),
};

/** Full desktop navigation layout preview. */
export const DesktopPreview: Story = {
  render: () => (
    <nav className='flex items-center gap-8 rounded-lg border border-gray-200 bg-white px-8 py-4 dark:border-gray-700 dark:bg-gray-900'>
      <a
        href='#'
        className='text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-200'>
        Domains
      </a>
      <a
        href='#'
        className='text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-200'>
        About
      </a>
      <a
        href='#'
        className='text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-200'>
        My Profile
      </a>
    </nav>
  ),
};

/** Mobile navigation panel in open state. */
export const MobileOpen: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
  render: () => (
    <div className='relative rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'>
      <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700'>
        <span className='text-sm font-semibold text-gray-900 dark:text-gray-100'>Navigation</span>
        <button
          type='button'
          className='rounded-md p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          aria-label='Close navigation'>
          <svg
            className='h-5 w-5'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>
      <nav className='flex flex-col gap-1 p-2'>
        <a
          href='#'
          className='rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'>
          Domains
        </a>
        <a
          href='#'
          className='rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'>
          About
        </a>
        <a
          href='#'
          className='rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'>
          My Profile
        </a>
      </nav>
    </div>
  ),
};

/** Desktop navigation with an active route highlighted. */
export const WithActiveRoute: Story = {
  render: () => (
    <nav className='flex items-center gap-8 rounded-lg border border-gray-200 bg-white px-8 py-4 dark:border-gray-700 dark:bg-gray-900'>
      <a
        href='#'
        className='text-sm font-medium text-blue-600 underline underline-offset-4 dark:text-blue-400'
        aria-current='page'>
        Domains
      </a>
      <a
        href='#'
        className='text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-200'>
        About
      </a>
      <a
        href='#'
        className='text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-200'>
        My Profile
      </a>
    </nav>
  ),
};
