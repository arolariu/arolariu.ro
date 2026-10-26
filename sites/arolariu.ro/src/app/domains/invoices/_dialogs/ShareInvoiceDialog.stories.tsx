import {InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../_contexts/DialogContext";
import ShareInvoiceDialog from "./ShareInvoiceDialog";

/**
 * Opens the real shared share dialog with its required invoice payload.
 */
function ShareInvoiceDialogOpener({invoice}: Readonly<{invoice: Invoice}>): null {
  const {open} = useDialog("SHARED__INVOICE_SHARE", "share", {invoice});

  useEffect(() => {
    open();
  }, [open]);

  return null;
}

/** Wraps the story in the real `DialogProvider` context and opens the share dialog for `invoice`. */
function withOpenShareDialog(invoice: Invoice): Decorator {
  return (Story) => (
    <DialogProvider>
      <ShareInvoiceDialogOpener invoice={invoice} />
      <Story />
    </DialogProvider>
  );
}

/**
 * ShareInvoiceDialog presents the privacy-aware sharing workflow (public
 * link/QR vs. private email invite). Mutating actions (`useInvoiceShare` →
 * `patchInvoice`/`sendEmail` server actions) are only triggered by user
 * interaction (selecting a mode, copying a link, sending an invite) — none
 * are invoked during the default render.
 */
const meta = {
  title: "Invoices/Dialogs/ShareInvoiceDialog",
  component: ShareInvoiceDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ShareInvoiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default selection mode — private invoice, showing public vs private sharing options. */
export const Default: Story = {
  decorators: [withOpenShareDialog(new InvoiceBuilder().withName("Weekly Groceries").withSharedWith([]).build())],
};
