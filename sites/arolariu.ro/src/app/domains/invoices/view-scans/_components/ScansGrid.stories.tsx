import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, ScanStatus, ScanType} from "@/types/scans";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider} from "../../_contexts/DialogContext";
import ScansGrid from "./ScansGrid";

/**
 * Builds a real `CachedScan` fixture for seeding the `useScansStore` Zustand
 * store in stories.
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
 * Seeds the real `useScansStore` with `count` scans on mount, and clears the
 * store on unmount so stories don't leak state into one another.
 */
function SeedScansHarness({count, children}: Readonly<{count: number; children: React.ReactNode}>): React.JSX.Element {
  useEffect(() => {
    const scans = Array.from({length: count}, (_unused, i) => createMockScan(i + 1));
    useScansStore.getState().setScans(scans);

    return () => {
      useScansStore.getState().clearScans();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per story mount
  }, []);

  return <>{children}</>;
}

/**
 * Wraps the story in the real `DialogProvider` context (each scan card's
 * preview/delete/rotate actions call `useDialogs()`) and seeds `count` scans.
 */
function withDialogProviderAndScans(count: number): Decorator {
  return (Story) => (
    <DialogProvider>
      <SeedScansHarness count={count}>
        <Story />
      </SeedScansHarness>
    </DialogProvider>
  );
}

/**
 * ScansGrid displays selectable scan cards backed by the real `useScans` hook
 * and `useScansStore` Zustand store, with per-card rotate/rename/preview/delete
 * actions wired through the real `DialogProvider` context.
 */
const meta = {
  title: "Invoices/ViewScans/ScansGrid",
  component: ScansGrid,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ScansGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Grid with scan cards. */
export const Default: Story = {
  decorators: [withDialogProviderAndScans(4)],
};

/** Empty state — no scans in the store, with upload CTA. */
export const EmptyState: Story = {
  decorators: [withDialogProviderAndScans(0)],
};
