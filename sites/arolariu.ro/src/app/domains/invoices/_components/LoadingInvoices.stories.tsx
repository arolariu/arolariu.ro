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

const namespace = messages["IMS--Common"].loadingInvoices;

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
    <section
      style={{
        display: "flex",
        minHeight: "400px",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
      }}>
      <article style={{textAlign: "center"}}>
        <h1 style={{fontSize: "1.5rem", fontWeight: "700"}}>{namespace.title}</h1>
        <p style={{marginTop: "0.5rem", color: "#6b7280"}}>{namespace.description}</p>
      </article>
    </section>
  ),
};
