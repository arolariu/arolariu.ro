import {useScansStore} from "@/stores";
import {ScanStatus, type CachedScan} from "@/types/scans";
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

const createMockScan = (id: string): CachedScan => ({
  id,
  name: `Scan ${id}`,
  description: "Mock scan for testing",
  userIdentifier: "user-123",
  createdAt: new Date(),
  updatedAt: new Date(),
  isSoftDeleted: false,
  status: ScanStatus.READY,
  imageUrl: "https://via.placeholder.com/400x600",
  imageMetadata: {
    width: 400,
    height: 600,
    size: 102400,
    contentType: "image/jpeg",
  },
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
