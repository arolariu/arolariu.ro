import type {Meta, StoryObj} from "@storybook/react";
import {ThemeProvider} from "next-themes";

/**
 * The Header component renders the site-wide navigation bar with logo,
 * navigation links, auth button, and theme toggle.
 *
 * Because `Header` depends on Clerk (`useAuth` in Navigation) and
 * `useWindowSize` from `@arolariu/components`, this story renders
 * the **skeleton / loading state** of the header to avoid provider issues.
 */
const meta = {
  title: "Site/Header",
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
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Header loading skeleton — a pulsing bar matching the header layout. */
export const Skeleton: Story = {
  decorators: [
    (Story) => (
      <div className='min-h-[80px] bg-gray-50 dark:bg-gray-950'>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <header className='border-b bg-white px-4 py-3 dark:bg-gray-900'>
      <nav className='mx-auto flex max-w-7xl items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='h-10 w-10 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />
          <div className='h-5 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700' />
        </div>
        <div className='hidden gap-6 md:flex'>
          <div className='h-4 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700' />
          <div className='h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700' />
          <div className='h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700' />
        </div>
        <div className='flex items-center gap-3'>
          <div className='h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />
          <div className='h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />
        </div>
      </nav>
    </header>
  ),
};

/** Header skeleton in dark mode context. */
export const SkeletonDark: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider
        attribute='class'
        defaultTheme='dark'
        enableSystem={false}>
        <div className='dark'>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  render: () => (
    <header className='border-b bg-gray-900 px-4 py-3'>
      <nav className='mx-auto flex max-w-7xl items-center justify-between'>
        <div className='flex items-center gap-3'>
          <div className='h-10 w-10 animate-pulse rounded-full bg-gray-700' />
          <div className='h-5 w-28 animate-pulse rounded bg-gray-700' />
        </div>
        <div className='hidden gap-6 md:flex'>
          <div className='h-4 w-20 animate-pulse rounded bg-gray-700' />
          <div className='h-4 w-16 animate-pulse rounded bg-gray-700' />
          <div className='h-4 w-24 animate-pulse rounded bg-gray-700' />
        </div>
        <div className='flex items-center gap-3'>
          <div className='h-8 w-8 animate-pulse rounded-full bg-gray-700' />
          <div className='h-8 w-8 animate-pulse rounded-full bg-gray-700' />
        </div>
      </nav>
    </header>
  ),
};
/** Header skeleton simulating a scrolled state with shadow and compact height. */
export const WithScrolled: Story = {
  render: () => (
    <header className='border-b bg-white/95 px-4 py-2 shadow-md backdrop-blur-sm dark:bg-gray-900/95'>
      <nav className='mx-auto flex max-w-7xl items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />
          <div className='h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700' />
        </div>
        <div className='hidden gap-4 md:flex'>
          <div className='h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700' />
          <div className='h-3 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700' />
          <div className='h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700' />
        </div>
        <div className='flex items-center gap-2'>
          <div className='h-7 w-7 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />
          <div className='h-7 w-7 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />
        </div>
      </nav>
    </header>
  ),
};
