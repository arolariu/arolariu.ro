import type {Meta, StoryObj} from "@storybook/react";
import {TbArrowRight, TbFileInvoice, TbPhoto, TbUpload} from "react-icons/tb";

/**
 * @remarks Static preview — component requires `useScans` Zustand store hook
 * which depends on server-side scan upload infrastructure and `CachedScan` state
 * unavailable in Storybook. The store requires pre-populated scan blobs from
 * Azure Blob Storage, making a real render infeasible without a mock store provider.
 */
const meta = {
  title: "Invoices/ViewScans/ScansGrid",
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

/** Grid with scan cards. */
export const Default: Story = {
  render: () => (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {["Receipt-001.jpg", "Receipt-002.png", "Receipt-003.jpg", "Receipt-004.png"].map((name) => (
        <div
          key={name}
          className='group relative cursor-pointer rounded-xl border transition-all hover:shadow-md'>
          <div className='relative aspect-[3/4] overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-800'>
            <div className='flex h-full items-center justify-center'>
              <TbPhoto className='h-12 w-12 text-gray-300' />
            </div>
          </div>
          <div className='p-3'>
            <p className='text-sm font-medium'>{name}</p>
            <p className='text-xs text-gray-500'>Uploaded 2 hours ago</p>
          </div>
        </div>
      ))}
    </div>
  ),
};

/** Loading skeleton state. */
export const Loading: Story = {
  render: () => (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
      {Array.from({length: 6}, (_, i) => (
        <div
          key={`skeleton-${String(i + 1)}`}
          className='h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700'
        />
      ))}
    </div>
  ),
};

/** Empty state with upload CTA. */
export const EmptyState: Story = {
  render: () => (
    <div className='flex items-center justify-center py-12'>
      <div className='mx-auto max-w-2xl rounded-xl border p-8 text-center'>
        <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800'>
          <TbPhoto className='h-8 w-8 text-gray-400' />
        </div>
        <h3 className='text-lg font-semibold'>No scans yet</h3>
        <p className='mt-1 text-sm text-gray-500'>Upload receipt photos to get started with invoice processing.</p>

        <div className='mt-6 space-y-3'>
          {[
            {step: 1, icon: <TbUpload className='h-4 w-4 text-blue-500' />, title: "Upload Scans", desc: "Take a photo or upload an image"},
            {step: 2, icon: <TbPhoto className='h-4 w-4 text-purple-500' />, title: "Review", desc: "Check extracted data"},
            {step: 3, icon: <TbFileInvoice className='h-4 w-4 text-green-500' />, title: "Create Invoice", desc: "Generate invoice from scan"},
          ].map((s) => (
            <div
              key={s.step}
              className='flex items-center gap-3 text-left'>
              <span className='flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600'>
                {s.step}
              </span>
              <div className='flex items-center gap-2'>
                {s.icon}
                <div>
                  <p className='text-sm font-medium'>{s.title}</p>
                  <p className='text-xs text-gray-500'>{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className='mt-6 flex justify-center gap-3'>
          <button className='flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700'>
            <TbUpload className='h-4 w-4' />
            Upload Scans
          </button>
          <button className='flex items-center gap-2 rounded-md border px-4 py-2 text-sm'>
            Learn More
            <TbArrowRight className='h-4 w-4' />
          </button>
        </div>
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
