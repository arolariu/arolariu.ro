import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, ScanStatus, ScanType} from "@/types/scans";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import ScanSelectionToolbar from "./ScanSelectionToolbar";

/* eslint-disable @typescript-eslint/no-empty-function -- Storybook action stub */
const noop = () => {};
/* eslint-enable @typescript-eslint/no-empty-function */

/**
 * Builds a real `CachedScan` fixture for seeding the `useScansStore` Zustand
 * store in stories (no mocking — this is the same shape the real scan-sync
 * pipeline produces).
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
 * Seeds the real `useScansStore` with `count` selected scans on mount, and
 * clears the store on unmount so stories don't leak state into one another.
 */
function SeedSelectionHarness({count, children}: Readonly<{count: number; children: React.ReactNode}>): React.JSX.Element {
  useEffect(() => {
    const scans = Array.from({length: count}, (_unused, i) => createMockScan(i + 1));
    useScansStore.getState().setScans(scans);
    useScansStore.getState().setSelectedScans(scans);

    return () => {
      useScansStore.getState().clearScans();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per story mount
  }, []);

  return <>{children}</>;
}

/** Builds a decorator that seeds `count` selected scans before the story renders. */
function withSeededSelection(count: number): Decorator {
  return (Story) => (
    <SeedSelectionHarness count={count}>
      <Story />
    </SeedSelectionHarness>
  );
}

/**
 * ScanSelectionToolbar appears when scans are selected in `useScansStore`,
 * providing bulk actions like creating invoices, deleting, and clearing
 * selection.
 */
const meta = {
  title: "Invoices/ViewScans/ScanSelectionToolbar",
  component: ScanSelectionToolbar,
  parameters: {
    layout: "fullscreen",
  },
  args: {
    onCreateInvoice: noop,
  },
} satisfies Meta<typeof ScanSelectionToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Single scan selected. */
export const SingleSelected: Story = {
  decorators: [withSeededSelection(1)],
};

/** Multiple scans selected. */
export const MultipleSelected: Story = {
  decorators: [withSeededSelection(5)],
};
