import type {Meta, StoryObj} from "@storybook/react";
import {expect, userEvent, waitFor, within} from "storybook/test";
import {OpenDialogButton, playOpenDialog, setupViewInvoiceStory, storyInvoice} from "@/app/domains/invoices/_storybook";
import DeleteInvoiceDialog from "./DeleteInvoiceDialog";

/**
 * DeleteInvoiceDialog displays a destructive confirmation dialog for permanently
 * removing an invoice with all associated data (scans, line items, shared access).
 *
 * This story mounts the real component wrapped in `OpenDialogButton` with
 * `SHARED__INVOICE_DELETE` dialog context seeded with fixture data.
 */
const meta = {
  title: "Invoices/Dialogs/DeleteInvoiceDialog",
  component: DeleteInvoiceDialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Destructive confirmation dialog for permanently deleting an invoice and all associated data (scans, line items, shared access). " +
          "Displays invoice identifier, title, and metadata with clear warning messaging. Mounted with real dialog context.",
      },
    },
  },
  beforeEach: () => {
    setupViewInvoiceStory({invoice: storyInvoice});
  },
} satisfies Meta<typeof DeleteInvoiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Confirmation dialog for deleting an invoice with items and scans. */
export const OpenConfirmation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Displays the delete confirmation dialog with a realistic invoice fixture containing merchant name, invoice identifier, " +
          "and metadata. Shows destructive action styling with warning color scheme and dual-button footer (Cancel/Delete).",
      },
    },
  },
  render: () => (
    <OpenDialogButton
      dialog="SHARED__INVOICE_DELETE"
      mode="delete"
      payload={{invoice: storyInvoice}}>
      <DeleteInvoiceDialog />
    </OpenDialogButton>
  ),
  play: async ({canvasElement, step}) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const openButton = canvas.getByRole("button", {name: /open dialog/i});

    await step("opens the dialog via the trigger button", async () => {
      await userEvent.click(openButton);
      await expect(await body.findByRole("dialog")).toBeInTheDocument();
      const nameMatches = await body.findAllByText(storyInvoice.name);
      await expect(nameMatches.length).toBeGreaterThan(0);
    });

    await step("closes the dialog with Escape", async () => {
      await userEvent.keyboard("{Escape}");
      await waitFor(async () => {
        await expect(body.queryByRole("dialog")).not.toBeInTheDocument();
      });
    });

    await step("re-opens the dialog via the trigger button", async () => {
      await userEvent.click(openButton);
      await expect(await body.findByRole("dialog")).toBeInTheDocument();
    });
  },
};

/** Delete dialog for an invoice with no scans, line items, or shares (minimal impact). */
export const MinimalInvoice: Story = {
  parameters: {
    docs: {
      description: {
        story: "Delete confirmation for an invoice with no associated scans, line items, or shared access, showing the minimal-impact variant of the warning.",
      },
    },
  },
  render: () => (
    <OpenDialogButton
      dialog="SHARED__INVOICE_DELETE"
      mode="delete"
      payload={{invoice: {...storyInvoice, items: [], scans: [], sharedWith: []}}}>
      <DeleteInvoiceDialog />
    </OpenDialogButton>
  ),
  play: playOpenDialog,
};
