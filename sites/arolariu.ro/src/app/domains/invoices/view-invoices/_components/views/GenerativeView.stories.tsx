import type {Meta, StoryObj} from "@storybook/react";
import {TbHelpCircle, TbMessage, TbSettings} from "react-icons/tb";

/**
 * Static visual preview of the GenerativeView (AI chat) component.
 *
 * @remarks Static preview — component uses complex state, MessageList sub-component,
 * and invoice data that cannot be easily mocked in Storybook. This story renders a
 * faithful HTML replica of the chat UI including tabs and settings panel.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/GenerativeView",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default generative view with chat tab and welcome message. */
export const Default: Story = {
  render: () => (
    <div className='space-y-4'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div>
          <h2 className='text-xl font-bold'>AI Invoice Analyst</h2>
          <p className='text-sm text-gray-500'>Chat with AI to analyze your invoices and get spending insights.</p>
        </div>
        <button className='flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm'>
          <TbHelpCircle className='h-4 w-4' />
          <span>Help</span>
        </button>
      </div>

      {/* Tabs */}
      <div className='flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800'>
        <button className='flex items-center gap-2 rounded-md bg-white px-4 py-1.5 text-sm font-medium shadow-sm dark:bg-gray-700'>
          <TbMessage className='h-4 w-4' />
          <span>Chat</span>
        </button>
        <button className='flex items-center gap-2 rounded-md px-4 py-1.5 text-sm text-gray-500'>
          <TbSettings className='h-4 w-4' />
          <span>Settings</span>
        </button>
      </div>

      {/* Chat Card */}
      <div className='rounded-xl border'>
        <div className='border-b p-4'>
          <h3 className='font-semibold'>AI Invoice Analyst</h3>
          <p className='text-sm text-gray-500'>Ask questions about your invoices, spending patterns, and more.</p>
        </div>
        <div className='p-4'>
          <div className='space-y-4'>
            {/* Welcome message */}
            <div className='flex gap-3'>
              <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-sm dark:bg-purple-900/50'>
                🤖
              </div>
              <div className='max-w-[80%] rounded-lg bg-gray-100 p-3 text-sm dark:bg-gray-800'>
                Hello! I&apos;m your AI Invoice Analyst. I can help you understand your spending patterns, compare prices, and provide
                insights about your purchases. What would you like to know?
              </div>
            </div>
          </div>
          {/* Input area placeholder */}
          <div className='mt-4 rounded-md border p-2'>
            <input
              type='text'
              placeholder='Ask about your invoices...'
              className='w-full bg-transparent text-sm outline-none'
              readOnly
            />
          </div>
        </div>
      </div>
    </div>
  ),
};
