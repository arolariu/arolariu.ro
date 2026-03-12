import type {Meta, StoryObj} from "@storybook/react";
import {withDialogProvider} from "../../../../../../../../.storybook/providers";
import InvoiceMetadataDialog from "./MetadataDialog";

/**
 * MetadataDialog renders a multi-mode (add/edit/delete) form for invoice metadata.
 * Requires DialogProvider context to manage open/close state.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/MetadataDialog",
  component: InvoiceMetadataDialog,
  parameters: {
    layout: "centered",
  },
  decorators: [
    withDialogProvider,
    (Story) => (
      <div className='max-w-md p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InvoiceMetadataDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default metadata dialog (closed state — requires `useDialog` to open). */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
