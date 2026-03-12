import type {Meta, StoryObj} from "@storybook/react";
import {PrivateMode} from "./ShareInvoiceDialog.Private";

/* eslint-disable @typescript-eslint/no-empty-function -- Storybook action stubs */
const noop = () => {};
/* eslint-enable @typescript-eslint/no-empty-function */

/**
 * ShareInvoiceDialog Private mode renders the private sharing form
 * with email input. Accepts callback props for navigation and form handling.
 */
const meta = {
  title: "Invoices/Dialogs/ShareInvoiceDialogPrivate",
  component: PrivateMode,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof PrivateMode>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default private sharing form with email input. */
export const Default: Story = {
  args: {
    onBack: noop,
    email: "",
    onEmailChange: noop,
    onSendEmail: noop as unknown as (e: React.SubmitEvent) => void,
  },
};

/** Dark mode variant. */
export const DarkMode: Story = {
  args: {
    onBack: noop,
    email: "",
    onEmailChange: noop,
    onSendEmail: noop as unknown as (e: React.SubmitEvent) => void,
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
