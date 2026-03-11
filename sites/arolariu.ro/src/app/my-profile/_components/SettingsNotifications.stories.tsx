import type {Meta, StoryObj} from "@storybook/react";
import {TbBell, TbMail, TbReport, TbShield, TbSparkles, TbWallet} from "react-icons/tb";

/**
 * Static visual preview of the SettingsNotifications component.
 *
 * The actual component depends on notification settings props,
 * so this story renders a faithful HTML replica of the notification settings panel.
 */
const meta = {
  title: "Pages/Profile/SettingsNotifications",
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

/** Default notification settings panel. */
export const Default: Story = {
  render: () => (
    <section className='space-y-6'>
      <div>
        <h2 className='text-xl font-bold'>Notifications</h2>
        <p className='text-sm text-gray-500'>Manage your email and alert preferences.</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {/* Email Master Toggle */}
        <div className='rounded-xl border p-5 md:col-span-2'>
          <div className='flex items-center gap-2'>
            <TbMail className='h-4 w-4' />
            <h3 className='font-semibold'>Email Notifications</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Control all email communications.</p>
          <div className='mt-3 flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Enable Email</p>
              <p className='text-xs text-gray-400'>Receive notifications by email</p>
            </div>
            <div className='h-5 w-9 rounded-full bg-blue-600' />
          </div>
        </div>

        {/* Reports */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbReport className='h-4 w-4' />
            <h3 className='font-semibold'>Reports</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Scheduled report delivery.</p>
          <div className='mt-3 space-y-3'>
            <div className='rounded-md border px-3 py-2 text-sm'>Weekly</div>
            {[
              {label: "Weekly Digest", enabled: true},
              {label: "Monthly Report", enabled: true},
            ].map((t) => (
              <div
                key={t.label}
                className='flex items-center justify-between'>
                <p className='text-sm'>{t.label}</p>
                <div className='h-5 w-9 rounded-full bg-blue-600' />
              </div>
            ))}
          </div>
        </div>

        {/* Financial Alerts */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbWallet className='h-4 w-4' />
            <h3 className='font-semibold'>Financial Alerts</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Spending and budget notifications.</p>
          <div className='mt-3 space-y-3'>
            {[
              {label: "Spending Alerts", enabled: true},
              {label: "Budget Alerts", enabled: false},
            ].map((t) => (
              <div
                key={t.label}
                className='flex items-center justify-between'>
                <p className='text-sm'>{t.label}</p>
                <div className={`h-5 w-9 rounded-full ${t.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Product Updates */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbSparkles className='h-4 w-4' />
            <h3 className='font-semibold'>Product Updates</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Feature and marketing notifications.</p>
          <div className='mt-3 space-y-3'>
            {[
              {label: "New Features", enabled: true},
              {label: "Marketing Emails", enabled: false},
            ].map((t) => (
              <div
                key={t.label}
                className='flex items-center justify-between'>
                <p className='text-sm'>{t.label}</p>
                <div className={`h-5 w-9 rounded-full ${t.enabled ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-700"}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Security Notifications */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbShield className='h-4 w-4' />
            <h3 className='font-semibold'>Security</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Security-related alerts.</p>
          <div className='mt-3 flex items-center justify-between'>
            <p className='text-sm'>Security Alerts</p>
            <div className='h-5 w-9 rounded-full bg-blue-600' />
          </div>
          <div className='mt-2 flex items-center gap-1 text-xs text-gray-400'>
            <TbBell className='h-3 w-3' />
            Security alerts are always enabled for your protection.
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
