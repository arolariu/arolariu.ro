import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import type {Meta, StoryObj} from "@storybook/react";
import {storyCachedImageScan, storyCachedPdfScan} from "../../_storybook";
import ScansHeader from "./ScansHeader";

const extraScan: CachedScan = {
  ...storyCachedImageScan,
  id: "scan-story-header-extra",
  name: "Pharmacy receipt",
  uploadedAt: new Date("2024-03-16T09:30:00.000Z"),
  cachedAt: new Date("2024-03-16T09:31:00.000Z"),
};

function seedScansHeaderStore(scans: readonly CachedScan[], isSyncing = false): () => void {
  const previousState = useScansStore.getState();
  const previousScans = [...previousState.scans];
  const previousSelectedScans = [...previousState.selectedScans];
  const previousHasHydrated = previousState.hasHydrated;
  const previousIsSyncing = previousState.isSyncing;
  const previousLastSyncTimestamp = previousState.lastSyncTimestamp;

  useScansStore.getState().setScans(scans);
  useScansStore.getState().setSelectedScans([]);
  useScansStore.getState().setHasHydrated(false);
  useScansStore.getState().setIsSyncing(isSyncing);
  useScansStore.getState().setLastSyncTimestamp(new Date("2024-03-16T09:35:00.000Z"));

  return () => {
    useScansStore.getState().setScans(previousScans);
    useScansStore.getState().setSelectedScans(previousSelectedScans);
    useScansStore.getState().setHasHydrated(previousHasHydrated);
    useScansStore.getState().setIsSyncing(previousIsSyncing);
    useScansStore.getState().setLastSyncTimestamp(previousLastSyncTimestamp);
  };
}

const meta = {
  title: "arolariu.ro/IMS/Components/Scan/ScansHeader",
  component: ScansHeader,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Mounts the real scans page header against deterministic scan store state, including scan count, last-sync text, navigation buttons, and sync action.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof ScansHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithScans: Story = {
  beforeEach: () => seedScansHeaderStore([storyCachedImageScan, storyCachedPdfScan, extraScan]),
  parameters: {
    docs: {
      description: {
        story: "Header with three ready scans and a deterministic last-sync timestamp.",
      },
    },
  },
};

export const Empty: Story = {
  beforeEach: () => seedScansHeaderStore([]),
  parameters: {
    docs: {
      description: {
        story: "Header with an empty scan store, showing the zero-count state through the real component.",
      },
    },
  },
};

export const Syncing: Story = {
  beforeEach: () => seedScansHeaderStore([storyCachedImageScan, storyCachedPdfScan], true),
  parameters: {
    docs: {
      description: {
        story: "Header while scan synchronization is in progress, using the real disabled sync button state.",
      },
    },
  },
};

/** Single scan — minimal count display. */
export const SingleScan: Story = {
  beforeEach: () => seedScansHeaderStore([storyCachedImageScan]),
  parameters: {
    docs: {
      description: {
        story: "Header with a single scan. Tests singular count display and minimal state rendering.",
      },
    },
  },
};

/** Many scans (10) — larger count test. */
export const ManyScans: Story = {
  beforeEach: () => {
    const manyScans = Array.from({length: 10}, (_, i) => ({
      ...storyCachedImageScan,
      id: `scan-header-many-${i}`,
      name: `Scan ${i + 1}`,
    }));
    return seedScansHeaderStore(manyScans);
  },
  parameters: {
    docs: {
      description: {
        story: "Header with 10 scans. Tests count display with larger dataset and plural text rendering.",
      },
    },
  },
};
