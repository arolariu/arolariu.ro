import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, ScanStatus, ScanType} from "@/types/scans";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import ScansHeader from "./ScansHeader";

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
 * Seeds the real `useScansStore` with `count` scans on mount, optionally
 * forcing the syncing flag, and clears the store on unmount.
 *
 * @remarks
 * `ScansHeader` (via `useScans`) triggers a real background sync on mount
 * once the store has hydrated from IndexedDB. That sync calls the real
 * `fetchScans` server action, which safely fails (no `exp`/Azure backend is
 * reachable from Storybook) and is caught internally, so `isSyncing` reverts
 * to `false` shortly after — matching production error-handling behavior.
 */
function SeedScansHarness({
  count,
  syncing,
  children,
}: Readonly<{count: number; syncing?: boolean; children: React.ReactNode}>): React.JSX.Element {
  useEffect(() => {
    const scans = Array.from({length: count}, (_unused, i) => createMockScan(i + 1));
    useScansStore.getState().setScans(scans);
    if (syncing) {
      useScansStore.getState().setIsSyncing(true);
    }

    return () => {
      useScansStore.getState().clearScans();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once per story mount
  }, []);

  return <>{children}</>;
}

/** Builds a decorator that seeds `count` scans (and optional syncing flag) before render. */
function withSeededScans(count: number, syncing = false): Decorator {
  return (Story) => (
    <SeedScansHarness
      count={count}
      syncing={syncing}>
      <Story />
    </SeedScansHarness>
  );
}

/**
 * ScansHeader shows the scan count, sync status, and action buttons
 * (upload, invoices, sync), backed by the real `useScans` hook and
 * `useScansStore` Zustand store.
 */
const meta = {
  title: "Invoices/ViewScans/ScansHeader",
  component: ScansHeader,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ScansHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default header with scans and sync info. */
export const Default: Story = {
  decorators: [withSeededScans(12)],
};

/** Syncing state — real `isSyncing` store flag set before render. */
export const Syncing: Story = {
  decorators: [withSeededScans(12, true)],
};
