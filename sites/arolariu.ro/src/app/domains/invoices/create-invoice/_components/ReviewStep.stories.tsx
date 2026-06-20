import {InvoiceCategory, PaymentType} from "@/types/invoices";
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
import ReviewStep from "./ReviewStep";

/**
 * Wrapper that seeds invoice details and selected scans via context.
 */
function ReviewStepWithDetailsAndScans({
  scansToSelect,
  name = "Grocery Shopping",
  category = InvoiceCategory.GROCERY,
  paymentType = PaymentType.Card,
  description = "Weekly grocery shopping at local supermarket",
}: Readonly<{
  scansToSelect: CachedScan[];
  name?: string;
  category?: InvoiceCategory;
  paymentType?: PaymentType;
  description?: string;
}>): React.JSX.Element {
  const {setName, setCategory, setPaymentType, setDescription, setTransactionDate, toggleScan, selectedScans} = useCreateInvoiceContext();

  React.useEffect(() => {
    setName(name);
    setCategory(category);
    setPaymentType(paymentType);
    setDescription(description);
    setTransactionDate(new Date("2024-03-15T10:30:00.000Z"));
  }, [name, category, paymentType, description, setName, setCategory, setPaymentType, setDescription, setTransactionDate]);

  React.useEffect(() => {
    // Only select if not already selected
    for (const scan of scansToSelect) {
      if (!selectedScans.some((s) => s.id === scan.id)) {
        toggleScan(scan);
      }
    }
  }, [scansToSelect, toggleScan, selectedScans]);

  return <ReviewStep />;
}

const meta = {
  title: "arolariu.ro/IMS/Forms/ReviewStep",
  component: ReviewStep,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Review step component for final confirmation before invoice creation (step 3). Displays summary of selected scans (thumbnails with hover animation) and invoice details (name, category, payment type, transaction date, description). Features a primary Create Invoice button with loading state and spinner during creation. Context-aware component that reads state from CreateInvoiceContext.",
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
} satisfies Meta<typeof ReviewStep>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleScan: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => <ReviewStepWithDetailsAndScans scansToSelect={[storyCachedImageScan]} />,
  parameters: {
    docs: {
      description: {
        story: "Shows the review step with a single selected scan and complete invoice details. Ready for creation.",
      },
    },
  },
};

export const MultipleScans: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    const scans: CachedScan[] = [
      storyCachedImageScan,
      storyCachedPdfScan,
      {
        ...storyCachedImageScan,
        id: "scan-review-3",
        name: "Receipt 3",
        metadata: {...storyCachedImageScan.metadata, scanId: "scan-review-3"},
      },
    ];
    seedInvoiceStoryStores({
      scans,
      selectedScans: [],
    });
  },
  render: () => {
    const scans: CachedScan[] = [
      storyCachedImageScan,
      storyCachedPdfScan,
      {
        ...storyCachedImageScan,
        id: "scan-review-3",
        name: "Receipt 3",
        metadata: {...storyCachedImageScan.metadata, scanId: "scan-review-3"},
      },
    ];
    return <ReviewStepWithDetailsAndScans scansToSelect={scans} />;
  },
  parameters: {
    docs: {
      description: {
        story: "Shows the review step with 3 selected scans. Displays scan thumbnails in a grid with badge showing count.",
      },
    },
  },
};

export const FastFoodCategory: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <ReviewStepWithDetailsAndScans
      scansToSelect={[storyCachedImageScan]}
      name='McDonalds Lunch'
      category={InvoiceCategory.FAST_FOOD}
      paymentType={PaymentType.Cash}
      description='Quick lunch during work break'
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Shows the review step with Fast Food category and Cash payment. Demonstrates different category/payment type badges.",
      },
    },
  },
};

export const NoDescription: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <ReviewStepWithDetailsAndScans
      scansToSelect={[storyCachedImageScan]}
      description=''
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Shows the review step without optional description field (description field is hidden when empty).",
      },
    },
  },
};

export const UnknownPayment: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedPdfScan],
      selectedScans: [],
    });
  },
  render: () => (
    <ReviewStepWithDetailsAndScans
      scansToSelect={[storyCachedPdfScan]}
      name='Car Maintenance'
      category={InvoiceCategory.CAR_AUTO}
      paymentType={PaymentType.Unknown}
      description=''
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Shows the review step with Car/Auto category and Unknown payment type. Demonstrates edge case payment type.",
      },
    },
  },
};

/** Shows the review step with home cleaning category. */
export const HomeCleaningCategory: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <ReviewStepWithDetailsAndScans
      scansToSelect={[storyCachedImageScan]}
      name='Weekly Cleaning Supplies'
      category={InvoiceCategory.HOME_CLEANING}
      paymentType={PaymentType.Card}
      description='Monthly stock-up of cleaning products'
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Review step showing Home Cleaning category - demonstrates category badge styling.",
      },
    },
  },
};

/** Shows the review step with long invoice name. */
export const LongInvoiceName: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <ReviewStepWithDetailsAndScans
      scansToSelect={[storyCachedImageScan]}
      name='Monthly Grocery Shopping at Local Supermarket Including Fresh Produce and Household Essentials'
      category={InvoiceCategory.GROCERY}
      paymentType={PaymentType.Card}
      description='Comprehensive shopping trip covering all weekly needs'
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Review step with long invoice name - demonstrates text truncation and wrapping.",
      },
    },
  },
};

/** Shows the review step with long description text. */
export const LongDescription: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedPdfScan],
      selectedScans: [],
    });
  },
  render: () => (
    <ReviewStepWithDetailsAndScans
      scansToSelect={[storyCachedPdfScan]}
      name='Quarterly Office Supplies'
      category={InvoiceCategory.OTHER}
      paymentType={PaymentType.Card}
      description='Large order of office supplies including paper, pens, notebooks, folders, staplers, and other essential items needed for the upcoming quarter. This purchase covers all departments and represents the standard quarterly restocking process that has been established over the past several years.'
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Review step with extensive description - demonstrates description field expansion and scrolling behavior.",
      },
    },
  },
};

/** Shows the review step with many scans selected. */
export const ManyScansSelected: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    const manyScans: CachedScan[] = Array.from({length: 6}, (_, i) => ({
      ...storyCachedImageScan,
      id: `review-many-${i + 1}`,
      name: `Receipt Page ${i + 1}`,
      metadata: {...storyCachedImageScan.metadata, scanId: `review-many-${i + 1}`},
    }));
    seedInvoiceStoryStores({
      scans: manyScans,
      selectedScans: [],
    });
  },
  render: () => {
    const manyScans: CachedScan[] = Array.from({length: 6}, (_, i) => ({
      ...storyCachedImageScan,
      id: `review-many-${i + 1}`,
      name: `Receipt Page ${i + 1}`,
      metadata: {...storyCachedImageScan.metadata, scanId: `review-many-${i + 1}`},
    }));
    return <ReviewStepWithDetailsAndScans scansToSelect={manyScans} />;
  },
  parameters: {
    docs: {
      description: {
        story: "Review step with many scans - demonstrates thumbnail grid layout and overflow handling.",
      },
    },
  },
};

/** Shows the review step with PDF scan only. */
export const PdfScanOnly: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedPdfScan],
      selectedScans: [],
    });
  },
  render: () => (
    <ReviewStepWithDetailsAndScans
      scansToSelect={[storyCachedPdfScan]}
      name='Multi-page Invoice Document'
      category={InvoiceCategory.OTHER}
      paymentType={PaymentType.Card}
      description='PDF document with multiple pages'
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Review step with PDF scan - demonstrates PDF thumbnail rendering.",
      },
    },
  },
};

/** Shows the review step with mixed scan types. */
export const MixedScanTypes: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    const mixedScans: CachedScan[] = [
      storyCachedImageScan,
      storyCachedPdfScan,
      {...storyCachedImageScan, id: "img-2", name: "Receipt Photo 2", metadata: {...storyCachedImageScan.metadata, scanId: "img-2"}},
    ];
    seedInvoiceStoryStores({
      scans: mixedScans,
      selectedScans: [],
    });
  },
  render: () => {
    const mixedScans: CachedScan[] = [
      storyCachedImageScan,
      storyCachedPdfScan,
      {...storyCachedImageScan, id: "img-2", name: "Receipt Photo 2", metadata: {...storyCachedImageScan.metadata, scanId: "img-2"}},
    ];
    return <ReviewStepWithDetailsAndScans scansToSelect={mixedScans} />;
  },
  parameters: {
    docs: {
      description: {
        story: "Review step with both image and PDF scans - demonstrates mixed format thumbnail rendering.",
      },
    },
  },
};

/** Shows the review step with NOT_DEFINED category. */
export const NotDefinedCategory: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <ReviewStepWithDetailsAndScans
      scansToSelect={[storyCachedImageScan]}
      name='Uncategorized Purchase'
      category={InvoiceCategory.NOT_DEFINED}
      paymentType={PaymentType.Cash}
      description=''
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Review step with NOT_DEFINED category - demonstrates default category handling.",
      },
    },
  },
};
