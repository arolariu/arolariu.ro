import type {Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../../_contexts/DialogContext";
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
    (Story) => (
      <DialogProvider>
        <div className='max-w-2xl p-4'>
          <Story />
        </div>
      </DialogProvider>
    ),
  ],
} satisfies Meta<typeof InvoiceRecipeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default recipe dialog (closed state — requires `useDialog` to open). */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
