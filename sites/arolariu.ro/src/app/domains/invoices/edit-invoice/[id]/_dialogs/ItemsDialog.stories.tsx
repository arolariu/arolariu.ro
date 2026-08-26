import {generateRandomInvoice} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../../_contexts/DialogContext";
import ItemsDialog from "./ItemsDialog";

/**
 * ItemsDialog bulk-edits invoice line items (add, modify, delete) with
 * pagination.
 *
 * @remarks
 * The dialog reads the full `Invoice` payload from `DialogContext` rather
 * than props, so this story opens the `EDIT_INVOICE__ITEMS` dialog via a
 * harness component that shares the same `DialogProvider`.
 *
 * Unlike the other dialog stories in this directory, the harness here
 * mounts `ItemsDialog` **only after** `open()` has set the real payload
 * (`isOpen` becomes `true`), rather than mounting immediately and opening
 * in an effect. `ItemsDialog` seeds its local `editableItems` state from
 * the invoice payload via `useState(items)`, which only reads its argument
 * on the component's *first* render — mounting it earlier (while payload is
 * still `null`) would permanently lock `editableItems` to an empty array
 * even after the dialog opens. This mirrors how the production
 * `DialogContainer` actually mounts dialogs: only once `openDialog(...)`
 * has already set a real payload, never before.
 *
 * The production component itself was still hardened with a null-safe
 * fallback (`payload ?? null`) so it cannot crash if ever mounted ahead of
 * an open dispatch.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/ItemsDialog",
  component: ItemsDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ItemsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockInvoice: Invoice = generateRandomInvoice();

/** Opens `EDIT_INVOICE__ITEMS` on mount, then mounts the real dialog once open. */
function ItemsDialogOpener({invoice}: Readonly<{invoice: Invoice}>): React.JSX.Element | null {
  const {open, isOpen} = useDialog("EDIT_INVOICE__ITEMS", "edit", invoice);

  useEffect(() => {
    open();
  }, [open]);

  return isOpen ? <ItemsDialog /> : null;
}

/** Default items editing dialog with the invoice's line items. */
export const Default: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <Story />
      </DialogProvider>
    ),
  ],
  render: () => <ItemsDialogOpener invoice={mockInvoice} />,
};
