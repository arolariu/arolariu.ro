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
  title: "arolariu.ro/IMS/Dialogs/Invoice/ShareInvoicePrivate",
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
    onSendEmail: noop as unknown as (e: React.FormEvent) => void,
  },
};

/** Private sharing form pre-filled with a recipient email address. */
export const WithEmail: Story = {
  args: {
    onBack: noop,
    email: "friend@example.com",
    onEmailChange: noop,
    onSendEmail: noop as unknown as (e: React.FormEvent) => void,
  },
};
