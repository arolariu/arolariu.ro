import type {CachedScan} from "@/types/scans";
import {ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, ScanStatus, ScanType} from "@/types/scans";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../_contexts/DialogContext";
import CreateInvoiceDialog from "./CreateInvoiceDialog";

/**
 * Builds a real `CachedScan` fixture for the dialog's `selectedScans` payload.
 */
function createMockScan(index: number): CachedScan {
  const now = new Date();
  const id = `storybook-scan-${index}`;
  return {
    id,
    userIdentifier: "00000000-0000-0000-0000-000000000000",
    name: `receipt-${index}.jpg`,
    blobUrl: `https://picsum.photos/seed/scan-${index}/400/300`,
    mimeType: "image/jpeg",
    sizeInBytes: 245_760,
    scanType: ScanType.JPEG,
    uploadedAt: now,
    status: ScanStatus.READY,
    metadata: {
      scanId: id,
      ownerId: "00000000-0000-0000-0000-000000000000",
      documentKind: ScanDocumentKind.RECEIPT,
      documentRole: ScanDocumentRole.PRIMARY,
      status: ScanMetadataStatus.READY,
      uploadedAt: now,
      uploadedBy: "00000000-0000-0000-0000-000000000000",
    },
    cachedAt: now,
  };
}

/**
 * Opens the real `VIEW_SCANS__CREATE_INVOICE` dialog with a `{selectedScans}`
 * payload on mount, mirroring the exact `useDialog` call made when a user
 * clicks "Create Invoice" in `ScanSelectionToolbar`.
 */
function CreateInvoiceDialogHarness({scans}: Readonly<{scans: CachedScan[]}>): null {
  const {open} = useDialog("VIEW_SCANS__CREATE_INVOICE", "add", {selectedScans: scans});

  useEffect(() => {
    open();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once on mount, mirrors a single "Create Invoice" click
  }, []);

  return null;
}

/** Wraps the story in the real `DialogProvider` context and opens the dialog with `scans`. */
function withOpenCreateInvoiceDialog(scans: CachedScan[]): Decorator {
  return (Story) => (
    <DialogProvider>
      <CreateInvoiceDialogHarness scans={scans} />
      <Story />
    </DialogProvider>
  );
}

/**
 * CreateInvoiceDialog lets users choose between creating one invoice per
 * scan or combining all selected scans into a single invoice. Actual invoice
 * creation is only triggered by clicking "Create" — it is not invoked during
 * the default render.
 */
const meta = {
  title: "Invoices/ViewScans/Dialogs/CreateInvoiceDialog",
  component: CreateInvoiceDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof CreateInvoiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default wizard selection step with 3 selected scans. */
export const Default: Story = {
  decorators: [withOpenCreateInvoiceDialog([createMockScan(1), createMockScan(2), createMockScan(3)])],
};

/** Single scan selected — batch/combine mode is less relevant with only one scan. */
export const SingleScan: Story = {
  decorators: [withOpenCreateInvoiceDialog([createMockScan(1)])],
};
