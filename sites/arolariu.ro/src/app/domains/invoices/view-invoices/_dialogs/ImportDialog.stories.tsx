import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogButton, playOpenDialog, resetInvoiceStoryStores} from "../../_storybook";
import ImportDialog from "./ImportDialog";

/**
 * Import dialog for uploading invoice files in CSV, PDF, or XLSX formats.
 *
 * @remarks
 * **Features:**
 * - Tab-based format selection (CSV, PDF, XLSX)
 * - Drag-and-drop file upload with react-dropzone
 * - File list with remove capability
 * - File type validation and size limits (10MB)
 * - Upload status feedback (success/error)
 *
 * **Dialog Context:**
 * Uses `VIEW_INVOICES__IMPORT` dialog with mode `add`.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Invoice/Import",
  component: ImportDialog,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => {
      resetInvoiceStoryStores();
      return <Story />;
    },
  ],
} satisfies Meta<typeof ImportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Import dialog opened for CSV file upload.
 *
 * @remarks
 * Dialog opens automatically on mount in `add` mode.
 * Users can drag and drop CSV files or click to browse.
 */
export const OpenCsvImport: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_INVOICES__IMPORT'
      mode='add'>
      <ImportDialog />
    </OpenDialogButton>
  ),
};

/** Import dialog (alternative render for testing different states). */
export const OpenForUpload: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_INVOICES__IMPORT'
      mode='add'>
      <ImportDialog />
    </OpenDialogButton>
  ),
};

/** Import dialog opened for PDF file upload. */
export const OpenPdfImport: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_INVOICES__IMPORT'
      mode='add'>
      <ImportDialog />
    </OpenDialogButton>
  ),
};

/** Import dialog opened for XLSX file upload. */
export const OpenXlsxImport: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_INVOICES__IMPORT'
      mode='add'>
      <ImportDialog />
    </OpenDialogButton>
  ),
};

/** Import dialog in initial empty state. */
export const EmptyState: Story = {
  play: playOpenDialog,
  render: () => (
    <OpenDialogButton
      dialog='VIEW_INVOICES__IMPORT'
      mode='add'>
      <ImportDialog />
    </OpenDialogButton>
  ),
};
