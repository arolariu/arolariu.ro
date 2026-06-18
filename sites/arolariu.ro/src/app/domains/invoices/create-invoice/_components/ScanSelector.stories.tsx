import type {CachedScan} from "@/types/scans";
import type {Meta, StoryObj} from "@storybook/react";
import React from "react";
import {
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyCachedImageScan,
  storyCachedPdfScan,
  WithCreateInvoiceContext,
} from "../../_storybook";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import ScanSelector from "./ScanSelector";

/**
 * Additional scan fixtures to create a larger grid.
 */
const additionalScans: CachedScan[] = Array.from({length: 8}, (_, i) => ({
  ...storyCachedImageScan,
  id: `scan-selector-${i + 1}`,
  name: `Receipt ${i + 1}`,
  uploadedAt: new Date(`2024-03-${String(15 + i).padStart(2, "0")}T10:00:00.000Z`),
  metadata: {
    ...storyCachedImageScan.metadata,
    scanId: `scan-selector-${i + 1}`,
  },
}));

/**
 * Wrapper that selects scans in CreateInvoiceContext on mount.
 */
function ScanSelectorWithSelection({scansToSelect}: Readonly<{scansToSelect: CachedScan[]}>): React.JSX.Element {
  const {toggleScan} = useCreateInvoiceContext();
  const hasInitialized = React.useRef(false);

  React.useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    for (const scan of scansToSelect) {
      toggleScan(scan);
    }
  }, [scansToSelect, toggleScan]);

  return <ScanSelector />;
}

const meta = {
  title: "arolariu.ro/IMS/Forms/ScanSelector",
  component: ScanSelector,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Scan selector component for step 1 of the create wizard. Displays a grid of available READY scans with checkbox overlays, scan metadata (name, upload date, size), and batch selection actions (Select All / Clear Selection). Supports pagination for mobile and desktop. Context-aware component that reads scans from useScansStore and writes selection to CreateInvoiceContext.",
      },
    },
  },
  decorators: [
    (Story) => (
      <WithCreateInvoiceContext>
        <div style={{padding: "2rem", backgroundColor: "var(--color-background)"}}>
          <Story />
        </div>
      </WithCreateInvoiceContext>
    ),
  ],
} satisfies Meta<typeof ScanSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithScans: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan, storyCachedPdfScan, ...additionalScans.slice(0, 3)],
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Shows the scan selector with 5 available scans. Users can toggle individual scans or use Select All / Clear Selection.",
      },
    },
  },
};

export const WithSelection: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan, storyCachedPdfScan, ...additionalScans.slice(0, 3)],
      selectedScans: [],
    });
  },
  render: () => <ScanSelectorWithSelection scansToSelect={[storyCachedImageScan, storyCachedPdfScan]} />,
  parameters: {
    docs: {
      description: {
        story: "Shows the selector with pre-selected scans. Selected count badge is visible and Clear Selection button appears.",
      },
    },
  },
};

export const AllSelected: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    const allScans = [storyCachedImageScan, storyCachedPdfScan, ...additionalScans.slice(0, 3)];
    seedInvoiceStoryStores({
      scans: allScans,
      selectedScans: [],
    });
  },
  render: () => {
    const allScans = [storyCachedImageScan, storyCachedPdfScan, ...additionalScans.slice(0, 3)];
    return <ScanSelectorWithSelection scansToSelect={allScans} />;
  },
  parameters: {
    docs: {
      description: {
        story: "Shows the selector with all scans selected. Select All button is replaced with Clear Selection.",
      },
    },
  },
};

export const Empty: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [],
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Shows the empty state when no READY scans are available. Displays photo icon and empty message.",
      },
    },
  },
};

/** Shows the selector with a single scan available. */
export const SingleScan: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Single scan available for selection - demonstrates minimal scan grid layout.",
      },
    },
  },
};

/** Shows the selector with only PDF scans. */
export const OnlyPdfScans: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    const pdfScans: CachedScan[] = [
      storyCachedPdfScan,
      {...storyCachedPdfScan, id: "pdf-2", name: "Invoice Document 2", metadata: {...storyCachedPdfScan.metadata, scanId: "pdf-2"}},
      {...storyCachedPdfScan, id: "pdf-3", name: "Receipt PDF 3", metadata: {...storyCachedPdfScan.metadata, scanId: "pdf-3"}},
    ];
    seedInvoiceStoryStores({
      scans: pdfScans,
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Grid showing only PDF format scans - demonstrates PDF thumbnail rendering.",
      },
    },
  },
};

/** Shows the selector with mixed image and PDF scans. */
export const MixedScanTypes: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    const mixedScans: CachedScan[] = [storyCachedImageScan, storyCachedPdfScan, ...additionalScans.slice(0, 2)];
    seedInvoiceStoryStores({
      scans: mixedScans,
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Mixed grid of image and PDF scans - demonstrates handling different scan formats together.",
      },
    },
  },
};

/** Shows the selector with many scans to demonstrate pagination. */
export const ManyScans: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    const manyScans: CachedScan[] = [storyCachedImageScan, storyCachedPdfScan, ...additionalScans];
    seedInvoiceStoryStores({
      scans: manyScans,
      selectedScans: [],
    });
  },
  parameters: {
    docs: {
      description: {
        story: "Large scan collection to demonstrate grid layout and pagination controls.",
      },
    },
  },
};

/** Shows the selector with partial selection. */
export const PartialSelection: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    const scans: CachedScan[] = [storyCachedImageScan, storyCachedPdfScan, ...additionalScans.slice(0, 4)];
    seedInvoiceStoryStores({
      scans,
      selectedScans: [],
    });
  },
  render: () => {
    const scansToSelect = [storyCachedImageScan, additionalScans[0] as CachedScan];
    return <ScanSelectorWithSelection scansToSelect={scansToSelect} />;
  },
  parameters: {
    docs: {
      description: {
        story: "Some scans selected out of available set - demonstrates selected count badge and Clear Selection button.",
      },
    },
  },
};

/** Shows the selector with one scan selected. */
export const SingleSelection: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan, storyCachedPdfScan, ...additionalScans.slice(0, 2)],
      selectedScans: [],
    });
  },
  render: () => <ScanSelectorWithSelection scansToSelect={[storyCachedPdfScan]} />,
  parameters: {
    docs: {
      description: {
        story: "Single scan selected - minimal selection state with count badge showing 1.",
      },
    },
  },
};
