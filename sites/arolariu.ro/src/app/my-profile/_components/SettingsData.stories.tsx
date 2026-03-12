import type {Meta, StoryObj} from "@storybook/react";
import {TbAlertTriangle, TbCloud, TbDatabase, TbDownload, TbShieldCheck, TbTrash} from "react-icons/tb";

/**
 * Static visual preview of the SettingsData component.
 *
 * The actual component depends on data settings props and constants,
 * so this story renders a faithful HTML replica of the data management panel.
 */
const meta = {
  title: "Pages/Profile/SettingsData",
  component: undefined as never,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default data settings panel with all sections. */
export const Default: Story = {
  render: () => (
    <section className='space-y-6'>
      <div>
        <h2 className='text-xl font-bold'>Data Management</h2>
        <p className='text-sm text-gray-500'>Control your data retention, backups, and privacy.</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {/* Data Retention */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbDatabase className='h-4 w-4' />
            <h3 className='font-semibold'>Data Retention</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>How long to keep your data.</p>
          <div className='mt-3 rounded-md border px-3 py-2 text-sm'>1 Year</div>
          <p className='mt-1 text-xs text-gray-400'>Data older than this period will be automatically deleted.</p>
        </div>

        {/* Auto Backup */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbCloud className='h-4 w-4' />
            <h3 className='font-semibold'>Auto Backup</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Automatic data backup settings.</p>
          <div className='mt-3 space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium'>Auto Backup</p>
                <p className='text-xs text-gray-400'>Automatically back up your data</p>
              </div>
              <div className='h-5 w-9 rounded-full bg-blue-600' />
            </div>
            <hr className='dark:border-gray-700' />
            <div>
              <p className='text-sm font-medium'>Backup Frequency</p>
              <div className='mt-1 rounded-md border px-3 py-2 text-sm'>Weekly</div>
            </div>
          </div>
        </div>

        {/* Privacy */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbShieldCheck className='h-4 w-4' />
            <h3 className='font-semibold'>Privacy</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Privacy and data sharing preferences.</p>
          <div className='mt-3 flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Share Anonymous Data</p>
              <p className='text-xs text-gray-400'>Help improve the platform</p>
            </div>
            <div className='h-5 w-9 rounded-full bg-gray-200 dark:bg-gray-700' />
          </div>
        </div>

        {/* Export Data */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbDownload className='h-4 w-4' />
            <h3 className='font-semibold'>Export Data</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Download a copy of all your data.</p>
          <div className='mt-3'>
            <button className='flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm'>
              <TbDownload className='h-4 w-4' />
              Download All Data
            </button>
            <p className='mt-1 text-xs text-gray-400'>Data exported as a ZIP file.</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className='rounded-xl border border-red-200 p-5 md:col-span-2 dark:border-red-800'>
          <div className='flex items-center gap-2 text-red-600'>
            <TbAlertTriangle className='h-4 w-4' />
            <h3 className='font-semibold'>Danger Zone</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Irreversible and destructive actions.</p>
          <div className='mt-3 space-y-3'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium'>Delete All Data</p>
                <p className='text-xs text-gray-400'>Permanently delete all your invoices and scans.</p>
              </div>
              <button className='flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm text-white'>
                <TbTrash className='h-4 w-4' />
                Delete
              </button>
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium'>Delete Account</p>
                <p className='text-xs text-gray-400'>Remove your account completely.</p>
              </div>
              <button className='rounded-md border px-3 py-1.5 text-sm'>Manage Account</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  ...Default,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
