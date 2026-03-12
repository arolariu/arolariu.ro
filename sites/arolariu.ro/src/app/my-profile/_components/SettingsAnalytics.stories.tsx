import type {Meta, StoryObj} from "@storybook/react";
import {TbChartBar, TbChartPie, TbClock, TbDatabase, TbDownload, TbTrendingUp} from "react-icons/tb";

/**
 * Static visual preview of the SettingsAnalytics component.
 *
 * The actual component depends on analytics settings props and constants,
 * so this story renders a faithful HTML replica of the analytics settings panel.
 */
const meta = {
  title: "Pages/Profile/SettingsAnalytics",
  component: undefined as never,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default analytics settings panel with all sections. */
export const Default: Story = {
  render: () => (
    <section className='space-y-6'>
      <div>
        <h2 className='text-xl font-bold'>Analytics</h2>
        <p className='text-sm text-gray-500'>Manage your analytics and tracking preferences.</p>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {/* Master Toggle */}
        <div className='rounded-xl border p-5 md:col-span-2'>
          <div className='flex items-center gap-2'>
            <TbChartBar className='h-4 w-4' />
            <h3 className='font-semibold'>Analytics Tracking</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Enable or disable all analytics features.</p>
          <div className='mt-3 flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium'>Enable Analytics</p>
              <p className='text-xs text-gray-400'>Track spending patterns and trends</p>
            </div>
            <div className='h-5 w-9 rounded-full bg-blue-600' />
          </div>
        </div>

        {/* Granularity */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbClock className='h-4 w-4' />
            <h3 className='font-semibold'>Granularity</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Choose data aggregation period.</p>
          <div className='mt-3 rounded-md border px-3 py-2 text-sm'>Daily</div>
        </div>

        {/* Export Format */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbDownload className='h-4 w-4' />
            <h3 className='font-semibold'>Export Format</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Default format for data exports.</p>
          <div className='mt-3 rounded-md border px-3 py-2 text-sm'>JSON</div>
        </div>

        {/* Tracking Options */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbChartPie className='h-4 w-4' />
            <h3 className='font-semibold'>Tracking</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Choose what to track.</p>
          <div className='mt-3 space-y-3'>
            {[
              {label: "Spending", enabled: true},
              {label: "Categories", enabled: true},
              {label: "Merchants", enabled: false},
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

        {/* Advanced */}
        <div className='rounded-xl border p-5'>
          <div className='flex items-center gap-2'>
            <TbTrendingUp className='h-4 w-4' />
            <h3 className='font-semibold'>Advanced Analytics</h3>
          </div>
          <p className='mt-1 text-xs text-gray-500'>Enable advanced features.</p>
          <div className='mt-3 space-y-3'>
            {[
              {label: "Benchmarking", enabled: false},
              {label: "Predictive Analysis", enabled: false},
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

        {/* Data Usage */}
        <div className='rounded-xl border p-5 md:col-span-2'>
          <div className='flex items-center gap-2'>
            <TbDatabase className='h-4 w-4' />
            <h3 className='font-semibold'>Data Usage</h3>
          </div>
          <div className='mt-3 rounded-md bg-blue-50 p-3 text-sm dark:bg-blue-900/20'>
            <p className='text-gray-600 dark:text-gray-400'>
              Analytics data is processed locally and never shared with third parties without your consent.
            </p>
          </div>
        </div>
      </div>
    </section>
  ),
};
