import type {Meta, StoryObj} from "@storybook/react";
import {PublicMode} from "./ShareInvoiceDialog.Public";

/* eslint-disable @typescript-eslint/no-empty-function -- Storybook action stubs */
const noop = () => {};
/* eslint-enable @typescript-eslint/no-empty-function */

/**
 * ShareInvoiceDialog Public mode renders the public sharing view
 * with shareable link and QR code tabs. Accepts callback props.
 */
const meta = {
  title: "Invoices/Dialogs/ShareInvoiceDialogPublic",
  component: PublicMode,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-md p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PublicMode>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default public sharing view with link and QR code tabs. */
export const Default: Story = {
  args: {
    onBack: noop,
    shareUrl: "https://arolariu.ro/domains/invoices/view-invoice/a1b2c3d4",
    copied: false,
    onCopyLink: noop,
    onCopyQRCode: noop,
  },
};

/** Dark mode variant. */
export const DarkMode: Story = {
  args: {
    onBack: noop,
    shareUrl: "https://arolariu.ro/domains/invoices/view-invoice/a1b2c3d4",
    copied: false,
    onCopyLink: noop,
    onCopyQRCode: noop,
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
