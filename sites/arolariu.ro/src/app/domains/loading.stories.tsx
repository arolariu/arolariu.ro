import type {Meta, StoryObj} from "@storybook/react";
import Loading from "./loading";

/**
 * Loading skeleton for the domains overview page, showing header with
 * progress bar, title, subtitle, and service cards grid placeholders.
 */
const meta = {
  title: "Invoices/States/DomainsLoading",
  component: Loading,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default loading skeleton for the domains overview page. */
export const Default: Story = {};
