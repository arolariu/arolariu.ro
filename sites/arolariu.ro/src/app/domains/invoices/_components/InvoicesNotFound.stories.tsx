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
    <div style={{display: 'flex', minHeight: '400px', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem', textAlign: 'center'}}>
      <h1 style={{fontSize: '1.5rem', fontWeight: '700'}}>{namespace.title}</h1>
      <article style={{maxWidth: '28rem', color: '#6b7280'}}>{namespace.description}</article>
      <Link
        href='/domains/invoices/create-invoice'
        style={{backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '0.5rem', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none', display: 'inline-block', transition: 'background-color 0.2s'}}>
        {namespace.cta}
      </Link>
    </div>
  ),
};
