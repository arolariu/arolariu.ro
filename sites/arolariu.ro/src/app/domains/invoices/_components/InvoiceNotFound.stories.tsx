import type {Meta, StoryObj} from "@storybook/react";
import InvoiceNotFound from "./InvoiceNotFound";

/**
 * InvoiceNotFound is displayed when a single invoice cannot be located
 * by its identifier. It shows a "not found" title and a description
 * interpolating the missing invoice's identifier.
 */
const meta = {
  title: "Invoices/InvoiceNotFound",
  component: InvoiceNotFound,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof InvoiceNotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default not-found state with a sample invoice identifier. */
export const Default: Story = {
  args: {
    invoiceIdentifier: "INV-2025-001",
  },
};

/** Not-found state with a UUID-style identifier. */
export const WithUuidIdentifier: Story = {
  args: {
    invoiceIdentifier: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  },
};

/** Not-found state in dark mode. */
export const DarkMode: Story = {
  args: {
    invoiceIdentifier: "INV-2025-001",
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Not-found state at mobile viewport width. */
export const MobileViewport: Story = {
  args: {
    invoiceIdentifier: "INV-2025-001",
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
