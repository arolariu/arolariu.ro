import type {Meta, StoryObj} from "@storybook/react";
import Loading from "./loading";

/**
 * Loading skeleton for the invoices domain main page, showing hero image,
 * title, description, CTA buttons, and steps timeline placeholders.
 */
const meta = {
  title: "Invoices/InvoicesLoading",
  component: Loading,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Loading>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default loading skeleton for the invoices domain page. */
export const Default: Story = {};
