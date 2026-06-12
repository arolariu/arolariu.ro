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
  title: "Invoices/ViewScans/ScanSelectionToolbar",
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
  cachedAt: new Date(),
});

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
      const {setScans, setHasHydrated, clearSelectedScans, selectAllScans} = useScansStore();
      const mockScans = [createMockScan("scan-1")];

      useEffect(() => {
        // Reset store state and prevent auto-sync
        clearSelectedScans();
        setHasHydrated(false);

        setScans(mockScans);
        selectAllScans();

        // Cleanup on unmount
        return () => {
          clearSelectedScans();
          setScans([]);
        };
      }, [setScans, setHasHydrated, clearSelectedScans, selectAllScans]);

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
      const {setScans, setHasHydrated, clearSelectedScans, selectAllScans} = useScansStore();
      const mockScans = [
        createMockScan("scan-1"),
        createMockScan("scan-2"),
        createMockScan("scan-3"),
        createMockScan("scan-4"),
        createMockScan("scan-5"),
      ];

      useEffect(() => {
        // Reset store state and prevent auto-sync
        clearSelectedScans();
        setHasHydrated(false);

        setScans(mockScans);
        selectAllScans();

        // Cleanup on unmount
        return () => {
          clearSelectedScans();
          setScans([]);
        };
      }, [setScans, setHasHydrated, clearSelectedScans, selectAllScans]);

      return <Story />;
    },
  ],
  args: {
    onCreateInvoice: () => console.log("Create invoices clicked"),
  },
};
