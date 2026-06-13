import {storyCachedImageScan} from "@/app/domains/invoices/_storybook/fixtures/scanFixtures";
import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import ScanSelectionToolbar from "./ScanSelectionToolbar";

/**
 * ScanSelectionToolbar appears when scans are selected, providing bulk
 * actions like creating invoices. Depends on `useScans` hook.
 */
const meta = {
  title: "arolariu.ro/IMS/Components/Scan/ScanSelectionToolbar",
  component: ScanSelectionToolbar,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Floating toolbar that appears when one or more scans are selected. Provides bulk actions including creating invoices " +
          "from selected scans and bulk deletion. Displays selected scan count and animates in/out based on selection state. " +
          "Mounted with real component using seeded scan store state via decorator that seeds scans and selected state without auto-sync.",
      },
    },
  },
} satisfies Meta<typeof ScanSelectionToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Creates a mock CachedScan fixture based on the story fixture.
 * @param id - Unique identifier for the scan
 * @internal
 */
const createMockScan = (id: string): CachedScan => ({
  ...storyCachedImageScan,
  id,
  name: `Scan ${id}`,
  cachedAt: new Date("2024-03-16T10:00:00.000Z"),
});

const singleSelectedScans = [createMockScan("scan-1")] as const;
const multipleSelectedScans = [
  createMockScan("scan-1"),
  createMockScan("scan-2"),
  createMockScan("scan-3"),
  createMockScan("scan-4"),
  createMockScan("scan-5"),
] as const;

function seedSelectedScans(mockScans: readonly CachedScan[]): () => void {
  const store = useScansStore.getState();
  const previousScans = [...store.scans];
  const previousSelectedScans = [...store.selectedScans];
  const previousHasHydrated = store.hasHydrated;
  const previousIsSyncing = store.isSyncing;
  const previousLastSyncTimestamp = store.lastSyncTimestamp;

  store.clearSelectedScans();
  store.setHasHydrated(false);
  store.setIsSyncing(false);
  store.setScans(mockScans);
  store.selectAllScans();

  return () => {
    const currentStore = useScansStore.getState();
    currentStore.setScans(previousScans);
    currentStore.setSelectedScans(previousSelectedScans);
    currentStore.setHasHydrated(previousHasHydrated);
    currentStore.setIsSyncing(previousIsSyncing);
    currentStore.setLastSyncTimestamp(previousLastSyncTimestamp);
  };
}

/** Single scan selected. */
export const SingleSelected: Story = {
  parameters: {
    docs: {
      description: {
        story: "Toolbar with one scan selected. Shows singular 'Create invoice' action and delete option.",
      },
    },
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        return seedSelectedScans(singleSelectedScans);
      }, []);

      return <Story />;
    },
  ],
  args: {
    onCreateInvoice: () => console.log("Create invoice clicked"),
  },
};

/** Multiple scans selected. */
export const MultipleSelected: Story = {
  parameters: {
    docs: {
      description: {
        story: "Toolbar with five scans selected. Shows plural 'Create invoices' action and bulk delete option.",
      },
    },
  },
  decorators: [
    (Story) => {
      useEffect(() => {
        return seedSelectedScans(multipleSelectedScans);
      }, []);

      return <Story />;
    },
  ],
  args: {
    onCreateInvoice: () => console.log("Create invoices clicked"),
  },
};
