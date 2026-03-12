import type {Meta, StoryObj} from "@storybook/react";
import {withDialogProvider} from "../../../../../../../../.storybook/providers";
import InvoiceRecipeDialog from "./RecipeDialog";

/**
 * RecipeDialog renders a multi-mode (create/view/edit) recipe form.
 * Requires DialogProvider context to manage open/close state.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/RecipeDialog",
  component: InvoiceRecipeDialog,
  parameters: {
    layout: "centered",
  },
  decorators: [
    withDialogProvider,
  ],
} satisfies Meta<typeof InvoiceRecipeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default recipe dialog (closed state — requires `useDialog` to open). */
export const Default: Story = {};
