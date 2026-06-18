import {
  invoicePresets,
  OpenDialogButton,
  playOpenDialog,
  setupViewInvoiceStory,
  storyDeletedInvoice,
  storyHugeInvoice,
  storyInvoice,
  storyLongNameInvoice,
  storyPublicInvoice,
  storySharedManyInvoice,
  withEntityPreset,
} from "@/app/domains/invoices/_storybook";
import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {expect, userEvent, waitFor, within} from "storybook/test";
import DeleteInvoiceDialog from "./DeleteInvoiceDialog";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * DeleteInvoiceDialog displays a destructive confirmation dialog for permanently
 * removing an invoice with all associated data (scans, line items, shared access).
 *
 * This story mounts the real component wrapped in `OpenDialogButton` with
 * `SHARED__INVOICE_DELETE` dialog context seeded with fixture data.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Invoice/DeleteInvoice",
  component: DeleteInvoiceDialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Destructive confirmation dialog for permanently deleting an invoice and all associated data (scans, line items, shared access). "
          + "Displays invoice identifier, title, and metadata with clear warning messaging. Mounted with real dialog context.",
      },
    },
  },
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
  beforeEach: (context) => {
    setupViewInvoiceStory({invoice: context.args.invoice});
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Confirmation dialog for deleting an invoice with items and scans. */
export const OpenConfirmation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Displays the delete confirmation dialog with a realistic invoice fixture containing merchant name, invoice identifier, "
          + "and metadata. Shows destructive action styling with warning color scheme and dual-button footer (Cancel/Delete).",
      },
    },
  },
  render: ({invoice}) => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_DELETE'
      mode='delete'
      payload={{invoice}}>
      <DeleteInvoiceDialog />
    </OpenDialogButton>
  ),
  play: async ({args, canvasElement, step}) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const openButton = canvas.getByRole("button", {name: /open dialog/i});

    await step("opens the dialog via the trigger button", async () => {
      await userEvent.click(openButton);
      await expect(await body.findByRole("dialog")).toBeInTheDocument();
      const nameMatches = await body.findAllByText(args.invoice.name);
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
        story:
          "Delete confirmation for an invoice with no associated scans, line items, or shared access, showing the minimal-impact variant of the warning.",
      },
    },
  },
  render: ({invoice}) => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_DELETE'
      mode='delete'
      payload={{invoice: {...invoice, items: [], scans: [], sharedWith: []}}}>
      <DeleteInvoiceDialog />
    </OpenDialogButton>
  ),
  play: playOpenDialog,
};

/** Delete dialog for a public invoice with shared access. */
export const PublicInvoice: Story = {
  args: {invoicePreset: "public", invoice: storyPublicInvoice},
  render: ({invoice}) => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_DELETE'
      mode='delete'
      payload={{invoice}}>
      <DeleteInvoiceDialog />
    </OpenDialogButton>
  ),
  play: playOpenDialog,
};

/** Delete dialog for an invoice with a long name (truncation test). */
export const LongNameInvoice: Story = {
  render: () => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_DELETE'
      mode='delete'
      payload={{invoice: storyLongNameInvoice}}>
      <DeleteInvoiceDialog />
    </OpenDialogButton>
  ),
  play: playOpenDialog,
};

/** Delete dialog for a soft-deleted invoice. */
export const SoftDeletedInvoice: Story = {
  render: () => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_DELETE'
      mode='delete'
      payload={{invoice: storyDeletedInvoice}}>
      <DeleteInvoiceDialog />
    </OpenDialogButton>
  ),
  play: playOpenDialog,
};

/** Delete dialog for an invoice with huge data. */
export const HugeInvoice: Story = {
  render: () => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_DELETE'
      mode='delete'
      payload={{invoice: storyHugeInvoice}}>
      <DeleteInvoiceDialog />
    </OpenDialogButton>
  ),
  play: playOpenDialog,
};

/** Delete dialog for invoice with many shares. */
export const SharedManyInvoice: Story = {
  render: () => (
    <OpenDialogButton
      dialog='SHARED__INVOICE_DELETE'
      mode='delete'
      payload={{invoice: storySharedManyInvoice}}>
      <DeleteInvoiceDialog />
    </OpenDialogButton>
  ),
  play: playOpenDialog,
};
