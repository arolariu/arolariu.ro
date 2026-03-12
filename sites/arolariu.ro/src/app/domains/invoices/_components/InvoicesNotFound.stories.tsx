import type {Meta, StoryObj} from "@storybook/react";
import Link from "next/link";
import messages from "../../../../../messages/en.json";

/**
 * InvoicesNotFound is displayed when the user has no invoices associated
 * with their account. It is an **async server component** that uses
 * `getTranslations` from `next-intl/server`.
 *
 * Because `getTranslations` depends on a Next.js request context that is
 * unavailable in Storybook, this story recreates the identical markup
 * and styling using the English i18n strings directly.
 */

const namespace = messages.Invoices.Shared.invoicesNotFound;

const meta = {
  title: "Invoices/States/InvoicesNotFound",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default empty-list state.
 *
 * Renders the same visual output as the server component, using the
 * English i18n strings directly and Next.js `Link` for the CTA.
 */
export const Default: Story = {
  render: () => (
    <div className='flex min-h-[400px] flex-col items-center justify-center gap-6 p-8 text-center'>
      <h1 className='text-2xl font-bold'>{namespace.title}</h1>
      <article className='max-w-md text-gray-500 dark:text-gray-400'>{namespace.description}</article>
      <Link
        href='/domains/invoices/create-invoice'
        className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3 text-sm font-medium transition-colors'>
        {namespace.cta}
      </Link>
    </div>
  ),
};

/** Empty-list state at mobile viewport width. */
export const MobileViewport: Story = {
  render: () => (
    <div className='flex min-h-[400px] flex-col items-center justify-center gap-6 p-8 text-center'>
      <h1 className='text-2xl font-bold'>{namespace.title}</h1>
      <article className='max-w-md text-gray-500 dark:text-gray-400'>{namespace.description}</article>
      <Link
        href='/domains/invoices/create-invoice'
        className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3 text-sm font-medium transition-colors'>
        {namespace.cta}
      </Link>
    </div>
  ),
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};

/** Empty-list state in dark mode. */
export const DarkMode: Story = {
  render: () => (
    <div className='flex min-h-[400px] flex-col items-center justify-center gap-6 p-8 text-center'>
      <h1 className='text-2xl font-bold'>{namespace.title}</h1>
      <article className='max-w-md text-gray-500 dark:text-gray-400'>{namespace.description}</article>
      <Link
        href='/domains/invoices/create-invoice'
        className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3 text-sm font-medium transition-colors'>
        {namespace.cta}
      </Link>
    </div>
  ),
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
