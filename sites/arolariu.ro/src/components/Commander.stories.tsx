import type {Meta, StoryObj} from "@storybook/react";
import {ThemeProvider} from "next-themes";

/**
 * The Commander component renders a command palette (Ctrl+K) dialog.
 *
 * Since it depends on `useFontContext`, `usePreferencesStore`, `useTheme`,
 * and `useRouter`, this story shows the **visual structure** of the command
 * palette items without requiring all providers.
 */
const meta = {
  title: "Site/Commander",
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

/** Static representation of the command palette UI. */
export const Preview: Story = {
  render: () => (
    <div className='w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b border-gray-200 px-4 py-3 dark:border-gray-700'>
        <input
          type='text'
          placeholder='Type a command or search...'
          className='w-full bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100'
          readOnly
        />
      </div>
      <div className='overflow-auto p-2'>
        <p className='px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400'>Navigation</p>
        <div className='flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>
          <span>🏠</span>
          <span>Homepage</span>
          <span className='ml-auto text-xs text-gray-400'>H</span>
        </div>
        <div className='my-1 h-px bg-gray-200 dark:bg-gray-700' />
        <p className='px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400'>Theme</p>
        <div className='flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>
          <span>☀️</span>
          <span>Light</span>
          <span className='ml-auto text-xs text-gray-400'>L</span>
        </div>
        <div className='flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>
          <span>🌙</span>
          <span>Dark</span>
          <span className='ml-auto text-xs text-gray-400'>D</span>
        </div>
        <div className='my-1 h-px bg-gray-200 dark:bg-gray-700' />
        <p className='px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400'>Language</p>
        <div className='flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>
          <span>🌐</span>
          <span>English</span>
          <span className='ml-auto text-xs text-gray-400'>EN</span>
        </div>
        <div className='flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>
          <span>🌐</span>
          <span>Romanian</span>
          <span className='ml-auto text-xs text-gray-400'>RO</span>
        </div>
      </div>
    </div>
  ),
};

/** Empty state when no results match the query. */
export const EmptyState: Story = {
  render: () => (
    <div className='w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b border-gray-200 px-4 py-3 dark:border-gray-700'>
        <input
          type='text'
          defaultValue='nonexistent command'
          className='w-full bg-transparent text-sm text-gray-900 outline-none dark:text-gray-100'
          readOnly
        />
      </div>
      <div className='py-6 text-center text-sm text-gray-500 dark:text-gray-400'>No results found.</div>
    </div>
  ),
};
