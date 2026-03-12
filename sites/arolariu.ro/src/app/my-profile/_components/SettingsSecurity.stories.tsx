import type {Meta, StoryObj} from "@storybook/react";
import {TbClock, TbDevices, TbKey, TbLock, TbShieldCheck, TbTrash} from "react-icons/tb";

/**
 * Static visual preview of the SettingsSecurity component.
 *
 * The actual component depends on security settings props with
 * trusted devices, so this story renders a faithful HTML replica.
 */
const meta = {
  title: "Pages/Profile/SettingsSecurity",
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className='p-6'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default security settings panel. */
export const Default: Story = {
  render: () => (
    <section className='space-y-6'>
      <div>
        <h2 className='text-xl font-bold'>Security</h2>
        <p className='text-sm text-gray-500'>Manage your account security and access.</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {/* 2FA */}
        <div className='rounded-xl border p-5 md:col-span-2'>
          <div className='flex items-center gap-2'>
            <TbKey className='h-4 w-4' />
            <h3 className='font-semibold'>Two-Factor Authentication</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Add an extra layer of security.</p>
          <div className='mt-3 flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Enable 2FA</p>
              <p className='text-xs text-gray-400'>Require verification code on login</p>
            </div>
            <div className='h-5 w-9 rounded-full bg-blue-600' />
          </div>
          <div className='mt-2 flex items-center gap-1 rounded-md bg-green-50 p-2 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400'>
            <TbShieldCheck className='h-3 w-3' />
            Two-factor authentication is active.
          </div>
        </div>

        {/* Session Settings */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbClock className='h-4 w-4' />
            <h3 className='font-semibold'>Session Settings</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Configure session behavior.</p>
          <div className='mt-3 space-y-3'>
            <div>
              <p className='text-sm font-medium'>Session Timeout</p>
              <div className='mt-1 rounded-md border px-3 py-2 text-sm'>30 minutes</div>
            </div>
            <hr className='dark:border-gray-700' />
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium'>Login Notifications</p>
                <p className='text-xs text-gray-400'>Get notified of new logins</p>
              </div>
              <div className='h-5 w-9 rounded-full bg-blue-600' />
            </div>
          </div>
        </div>

        {/* Password */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbLock className='h-4 w-4' />
            <h3 className='font-semibold'>Password &amp; Access</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Manage your password.</p>
          <div className='mt-3'>
            <button className='w-full rounded-md border px-3 py-2 text-sm'>Change Password</button>
            <p className='mt-2 text-xs text-gray-400'>Managed via Clerk authentication.</p>
          </div>
        </div>

        {/* Trusted Devices */}
        <div className='rounded-xl border p-5 md:col-span-2'>
          <div className='flex items-center gap-2'>
            <TbDevices className='h-4 w-4' />
            <h3 className='font-semibold'>Trusted Devices</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Manage devices with saved sessions.</p>
          <div className='mt-3 space-y-2'>
            {[
              {name: "Chrome on Windows", lastUsed: "2025-01-15", isCurrent: true},
              {name: "Firefox on macOS", lastUsed: "2025-01-10", isCurrent: false},
            ].map((d) => (
              <div
                key={d.name}
                className='flex items-center justify-between rounded-md border p-3'>
                <div>
                  <p className='text-sm font-medium'>{d.name}</p>
                  <p className='text-xs text-gray-400'>Last used: {d.lastUsed}</p>
                </div>
                {d.isCurrent ? (
                  <span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800'>Current</span>
                ) : (
                  <button className='rounded-md p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20'>
                    <TbTrash className='h-4 w-4 text-gray-400' />
                  </button>
                )}
              </div>
            ))}
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

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  ...Default,
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
