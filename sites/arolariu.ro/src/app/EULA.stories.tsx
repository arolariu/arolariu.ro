import type {Meta, StoryObj} from "@storybook/react";
import {TbCheck, TbCookie, TbGlobe, TbInfoCircleFilled, TbLock, TbShield} from "react-icons/tb";

/**
 * Static visual preview of the EULA component.
 *
 * The actual component depends on server actions (getCookie, setCookie),
 * Zustand preferences store, and privacy/terms sub-screens, so this story
 * renders a faithful HTML replica of the EULA consent card with
 * language picker, policy links, and cookie toggles.
 */
const meta = {
  title: "App/EULA",
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

/** Default EULA consent card with all sections. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='p-6 text-center'>
        <div className='mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30'>
          <TbShield className='h-7 w-7 text-purple-600 dark:text-purple-400' />
        </div>
        <h1 className='text-xl font-bold'>Welcome to arolariu.ro</h1>
        <p className='mt-1 text-sm text-gray-500'>Please review and accept our terms to continue.</p>

        {/* Language Picker */}
        <div className='mt-3 flex items-center justify-center gap-2'>
          <TbGlobe className='h-4 w-4 text-gray-400' />
          <label className='text-xs text-gray-500'>Language</label>
          <select
            className='rounded-md border bg-transparent px-2 py-1 text-sm'
            disabled>
            <option>English (EN)</option>
            <option>Română (RO)</option>
            <option>Français (FR)</option>
          </select>
        </div>
      </div>

      <div className='space-y-4 px-6'>
        <p className='text-center text-sm text-gray-600 dark:text-gray-400'>
          By using this platform, you agree to our Terms of Service and Privacy Policy.
        </p>

        {/* Policy Cards */}
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-lg border p-4'>
            <div className='flex items-center gap-2'>
              <TbLock className='h-4 w-4 text-purple-500' />
              <h3 className='text-sm font-semibold'>Terms of Service</h3>
            </div>
            <p className='mt-1 text-xs text-gray-500'>Rules and guidelines for using the platform.</p>
            <button className='mt-2 w-full rounded-md border px-3 py-1.5 text-xs'>Read Terms</button>
          </div>
          <div className='rounded-lg border p-4'>
            <div className='flex items-center gap-2'>
              <TbShield className='h-4 w-4 text-purple-500' />
              <h3 className='text-sm font-semibold'>Privacy Policy</h3>
            </div>
            <p className='mt-1 text-xs text-gray-500'>How we collect, use, and protect your data.</p>
            <button className='mt-2 w-full rounded-md border px-3 py-1.5 text-xs'>Read Policy</button>
          </div>
        </div>

        <hr className='dark:border-gray-700' />

        {/* Cookies Section */}
        <div className='space-y-3'>
          <div className='flex items-center gap-2'>
            <TbCookie className='h-4 w-4 text-amber-500' />
            <h3 className='text-sm font-semibold'>Cookie Preferences</h3>
          </div>
          <p className='text-xs text-gray-500'>Choose which cookies you allow us to use.</p>

          {/* Essential cookies */}
          <div className='rounded-lg border p-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <TbLock className='h-4 w-4 text-gray-400' />
                <span className='text-sm font-medium'>Essential Cookies</span>
                <span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800'>Required</span>
              </div>
              <div className='h-5 w-9 rounded-full bg-gray-900 dark:bg-gray-100' />
            </div>
            <p className='mt-1 text-xs text-gray-500'>Required for basic site functionality and security.</p>
          </div>

          {/* Analytics cookies */}
          <div className='rounded-lg border p-3'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <TbInfoCircleFilled className='h-4 w-4 text-gray-400' />
                <span className='text-sm font-medium'>Analytics Cookies</span>
                <span className='rounded-full border px-2 py-0.5 text-xs'>Optional</span>
              </div>
              <div className='h-5 w-9 rounded-full bg-gray-900 dark:bg-gray-100' />
            </div>
            <p className='mt-1 text-xs text-gray-500'>Help us understand how users interact with the site.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='p-6 text-center'>
        <button className='flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900'>
          <TbCheck className='h-4 w-4' />
          Accept & Continue
        </button>
        <p className='mt-2 text-xs text-gray-400'>By using this platform, you agree to our Terms of Service and Privacy Policy.</p>
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
