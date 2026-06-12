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
  },
  decorators: [
    (Story, {args}) => {
      const {setScans, setHasHydrated, clearSelectedScans, selectAllScans} = useScansStore();
      const mockScans = args.mockScans as CachedScan[] | undefined;

      useEffect(() => {
        // Reset store state
        clearSelectedScans();
        setHasHydrated(true);

        if (mockScans) {
          setScans(mockScans);
          selectAllScans();
        }

        // Cleanup on unmount
        return () => {
          clearSelectedScans();
          setScans([]);
        };
      }, [mockScans, setScans, setHasHydrated, clearSelectedScans, selectAllScans]);

      return <Story />;
    },
  ],
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
  args: {
    onCreateInvoice: () => console.log("Create invoice clicked"),
    mockScans: [createMockScan("scan-1")],
  },
};

/** Multiple scans selected. */
export const MultipleSelected: Story = {
  args: {
    onCreateInvoice: () => console.log("Create invoices clicked"),
    mockScans: [
      createMockScan("scan-1"),
      createMockScan("scan-2"),
      createMockScan("scan-3"),
      createMockScan("scan-4"),
      createMockScan("scan-5"),
    ],
  },
};
