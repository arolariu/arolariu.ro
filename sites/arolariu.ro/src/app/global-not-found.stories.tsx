import type {Meta, StoryObj} from "@storybook/react";

/**
 * Static visual preview of the GlobalNotFound (404) page.
 *
 * The actual component is a React Server Component that uses `headers()`,
 * `getLocale()`, `getMessages()`, and server actions, so this story
 * renders a faithful HTML replica of the 404 page with hero section,
 * QR code placeholder, and action buttons.
 */
const meta = {
  title: "Pages/Home/GlobalNotFound",
  component: undefined as never,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className='min-h-screen bg-gray-50 p-4 dark:bg-gray-950'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default 404 page with hero, QR code, and action buttons. */
export const Default: Story = {
  render: () => (
    <div className='mx-auto max-w-2xl space-y-12 py-16'>
      {/* Hero Section */}
      <section className='text-center'>
        <h1 className='text-7xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100'>404</h1>
        <p className='mt-4 text-xl text-gray-600 dark:text-gray-400'>Page not found</p>
        <p className='mt-2 text-sm text-gray-500'>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </section>

      {/* QR Section */}
      <section className='text-center'>
        <h2 className='text-sm font-medium text-gray-600 dark:text-gray-400'>Additional Information</h2>
        <div className='mx-auto mt-4 flex h-40 w-40 items-center justify-center rounded-xl border bg-white shadow-sm dark:bg-gray-900'>
          <div className='text-center'>
            <div className='mx-auto grid h-24 w-24 grid-cols-3 gap-0.5'>
              {Array.from({length: 9}).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-sm ${i % 2 === 0 ? "bg-gray-800 dark:bg-gray-200" : "bg-white dark:bg-gray-800"}`}
                />
              ))}
            </div>
            <p className='mt-2 text-xs text-gray-400'>Diagnostics QR</p>
          </div>
        </div>
      </section>

      {/* Actions Section */}
      <section className='text-center'>
        <p className='text-sm text-gray-500'>Think this is an error?</p>
        <div className='mt-4 flex justify-center gap-3'>
          <button className='rounded-md border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800'>
            Submit Error Report
          </button>
          <button className='rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200'>
            Return to Homepage
          </button>
        </div>
      </section>
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
