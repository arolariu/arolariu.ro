import type {Meta, StoryObj} from "@storybook/react";
import {TbExternalLink, TbGlobe, TbMail, TbUsers} from "react-icons/tb";

/**
 * Static visual preview of the TimelineSharedWithList component.
 *
 * @remarks Static preview — component uses `useInvoice` hook which imports "use server"
 * action (fetchInvoice from `@/lib/actions/invoices/fetchInvoice`) that cannot be bundled
 * by Storybook's Vite/Rollup. Also depends on `useInvoiceContext`, `useDialog`, and
 * `useUserInformation`. This story renders a faithful HTML replica showing shared users
 * with avatars, email actions, and a public access warning.
 */
const meta = {
  title: "Invoices/ViewInvoice/Timeline/SharedWithList",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default with two shared users. */
export const Default: Story = {
  render: () => (
    <div className='space-y-3 border-t pt-4'>
      <div className='flex items-center gap-2'>
        <TbUsers className='text-muted-foreground h-4 w-4' />
        <p className='text-xs font-medium text-gray-500'>Shared with</p>
        <span className='rounded-full bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800'>2</span>
      </div>
      <div className='space-y-2'>
        {["alice@example.com", "bob@example.com"].map((user) => (
          <div
            key={user}
            className='flex items-center justify-between rounded-md p-1.5'>
            <div className='flex items-center gap-2'>
              <div className='bg-primary/10 text-primary flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium'>
                {user.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className='text-sm font-medium'>{user.split("@")[0]}</p>
                <p className='text-xs text-gray-400'>{user}</p>
              </div>
            </div>
            <button className='rounded-md p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800'>
              <TbMail className='h-3.5 w-3.5' />
            </button>
          </div>
        ))}
      </div>
      <button className='flex w-full items-center justify-center gap-2 rounded-md border bg-transparent px-3 py-1.5 text-sm'>
        <TbExternalLink className='h-3.5 w-3.5' />
        Manage Sharing
      </button>
    </div>
  ),
};

/** Public access state with warning alert. */
export const PublicAccess: Story = {
  render: () => (
    <div className='space-y-3 border-t pt-4'>
      <div className='flex items-center gap-2'>
        <TbUsers className='text-muted-foreground h-4 w-4' />
        <p className='text-xs font-medium text-gray-500'>Shared with</p>
        <span className='rounded-full bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800'>Public</span>
      </div>
      <div className='rounded-md border border-orange-500/50 bg-orange-500/10 p-3'>
        <div className='flex items-center gap-2'>
          <TbGlobe className='h-4 w-4 text-orange-500' />
          <p className='text-sm font-semibold text-orange-600 dark:text-orange-400'>Public Access Enabled</p>
        </div>
        <p className='text-muted-foreground mt-1 text-xs'>Anyone with the link can view this invoice.</p>
      </div>
      <button className='flex w-full items-center justify-center gap-2 rounded-md border bg-transparent px-3 py-1.5 text-sm'>
        <TbExternalLink className='h-3.5 w-3.5' />
        Manage Sharing
      </button>
    </div>
  ),
};
