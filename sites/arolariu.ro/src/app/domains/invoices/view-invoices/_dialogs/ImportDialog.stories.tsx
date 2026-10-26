import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../_contexts/DialogContext";
import ImportDialog from "./ImportDialog";

/**
 * Opens the real `VIEW_INVOICES__IMPORT` dialog on mount, mirroring the
 * exact `useDialog` call `InvoicesHeader` makes when a user clicks the
 * "Import" button.
 */
function ImportDialogHarness(): null {
  const {open} = useDialog("VIEW_INVOICES__IMPORT");

  useEffect(() => {
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per story mount, mirrors a single "Import" click
  }, []);

  return null;
}

/**
 * Wraps the story in the real `DialogProvider` context and opens the import
 * dialog via the harness above.
 */
const withOpenImportDialog: Decorator = (Story) => (
  <DialogProvider>
    <ImportDialogHarness />
    <Story />
  </DialogProvider>
);

/**
 * ImportDialog lets users import invoice files (CSV, PDF, XLSX) via
 * drag-and-drop or file picker, backed by `react-dropzone`.
 *
 * Mounted as the real production component with its real open state coming
 * from the `DialogProvider` context — no mocking involved. File selection
 * state is intentionally left empty since it is driven entirely by real
 * user drag-and-drop/file-picker interaction, which cannot be faithfully
 * pre-seeded without props on the component.
 */
const meta = {
  title: "Invoices/ViewInvoices/Dialogs/ImportDialog",
  component: ImportDialog,
  decorators: [withOpenImportDialog],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ImportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default import dialog, open, with an empty dropzone. */
export const Default: Story = {};
