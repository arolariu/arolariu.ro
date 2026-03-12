import type {Meta, StoryObj} from "@storybook/react";
import messages from "../../../../../messages/en.json";

/**
 * LoadingInvoices displays a loading state while the invoice list is being
 * fetched. It is an **async server component** that uses `getTranslations`
 * from `next-intl/server`.
 *
 * Because `getTranslations` depends on a Next.js request context that is
 * unavailable in Storybook, this story recreates the identical markup
 * using the same i18n messages and SCSS module styles.
 */

const namespace = messages.Invoices.Shared.loadingInvoices;

const meta = {
  title: "Invoices/States/LoadingInvoices",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default loading-invoices skeleton.
 *
 * Renders the same visual output as the server component, using the
 * English i18n strings directly.
 */
export const Default: Story = {
  render: () => (
    <section className='flex min-h-[400px] flex-col items-center justify-center gap-4 p-8'>
      <article className='text-center'>
        <h1 className='text-2xl font-bold'>{namespace.title}</h1>
        <p className='mt-2 text-gray-500 dark:text-gray-400'>{namespace.description}</p>
      </article>
    </section>
  ),
};
