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
import InvoiceDetailsForm from "./InvoiceDetailsForm";

/**
 * Wrapper that selects scans in CreateInvoiceContext on mount.
 */
function InvoiceDetailsFormWithSelection({scansToSelect}: Readonly<{scansToSelect: CachedScan[]}>): React.JSX.Element {
  const {toggleScan, selectedScans} = useCreateInvoiceContext();

  React.useEffect(() => {
    // Only select if not already selected
    for (const scan of scansToSelect) {
      if (!selectedScans.some((s) => s.id === scan.id)) {
        toggleScan(scan);
      }
    }
  }, [scansToSelect, toggleScan, selectedScans]);

  return <InvoiceDetailsForm />;
}

const meta = {
  title: "arolariu.ro/IMS/Forms/InvoiceDetailsForm",
  component: InvoiceDetailsForm,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Invoice details form for step 2 of the create wizard. Displays fields for invoice name (required), category dropdown, payment type dropdown, transaction date picker (calendar popover), and optional description textarea. Shows scan thumbnail preview on desktop/right side. Context-aware component that reads/writes invoice details from CreateInvoiceContext.",
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
} satisfies Meta<typeof InvoiceDetailsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithSelectedScan: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => <InvoiceDetailsFormWithSelection scansToSelect={[storyCachedImageScan]} />,
  parameters: {
    docs: {
      description: {
        story: "Shows the form with a selected scan thumbnail preview. All form fields are interactive and persist to context state.",
      },
    },
  },
};

export const WithoutScan: Story = {
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
        story: "Shows the form without scan preview (no scan selected). Form fields remain fully functional.",
      },
    },
  },
};

/** Wrapper that pre-fills invoice details via context. */
function InvoiceDetailsFormWithPrefill({
  scansToSelect,
  name = "",
  category = InvoiceCategory.NOT_DEFINED,
  paymentType = PaymentType.Unknown,
  description = "",
  transactionDate,
}: Readonly<{
  scansToSelect: CachedScan[];
  name?: string;
  category?: InvoiceCategory;
  paymentType?: PaymentType;
  description?: string;
  transactionDate?: Date;
}>): React.JSX.Element {
  const {setName, setCategory, setPaymentType, setDescription, setTransactionDate, toggleScan, selectedScans} = useCreateInvoiceContext();

  React.useEffect(() => {
    setName(name);
    setCategory(category);
    setPaymentType(paymentType);
    setDescription(description);
    if (transactionDate) {
      setTransactionDate(transactionDate);
    }
  }, [name, category, paymentType, description, transactionDate, setName, setCategory, setPaymentType, setDescription, setTransactionDate]);

  React.useEffect(() => {
    for (const scan of scansToSelect) {
      if (!selectedScans.some((s) => s.id === scan.id)) {
        toggleScan(scan);
      }
    }
  }, [scansToSelect, toggleScan, selectedScans]);

  return <InvoiceDetailsForm />;
}

/** Shows the form with pre-filled name only. */
export const WithNameOnly: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <InvoiceDetailsFormWithPrefill
      scansToSelect={[storyCachedImageScan]}
      name='Weekly Groceries'
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Form with only invoice name filled - demonstrates partial completion state.",
      },
    },
  },
};

/** Shows the form with long invoice name. */
export const WithLongName: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <InvoiceDetailsFormWithPrefill
      scansToSelect={[storyCachedImageScan]}
      name='Monthly Grocery Shopping at Local Supermarket Including Fresh Produce and Household Essentials'
      category={InvoiceCategory.GROCERY}
      paymentType={PaymentType.Card}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Form with very long invoice name - demonstrates text field overflow handling.",
      },
    },
  },
};

/** Shows the form with all fields filled. */
export const CompleteForm: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <InvoiceDetailsFormWithPrefill
      scansToSelect={[storyCachedImageScan]}
      name='Costco Warehouse Shopping'
      category={InvoiceCategory.GROCERY}
      paymentType={PaymentType.Card}
      description='Monthly bulk shopping trip'
      transactionDate={new Date("2024-03-15T10:00:00.000Z")}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Form with all fields completed - demonstrates fully populated state ready for submission.",
      },
    },
  },
};

/** Shows the form with long description text. */
export const WithLongDescription: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedPdfScan],
      selectedScans: [],
    });
  },
  render: () => (
    <InvoiceDetailsFormWithPrefill
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
        story: "Form with extensive description - demonstrates textarea expansion and scrolling.",
      },
    },
  },
};

/** Shows the form with fast food category. */
export const FastFoodCategory: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <InvoiceDetailsFormWithPrefill
      scansToSelect={[storyCachedImageScan]}
      name='McDonalds Lunch'
      category={InvoiceCategory.FAST_FOOD}
      paymentType={PaymentType.Cash}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Form with Fast Food category selected - demonstrates category dropdown selection.",
      },
    },
  },
};

/** Shows the form with home cleaning category. */
export const HomeCleaningCategory: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <InvoiceDetailsFormWithPrefill
      scansToSelect={[storyCachedImageScan]}
      name='Cleaning Supplies'
      category={InvoiceCategory.HOME_CLEANING}
      paymentType={PaymentType.Card}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Form with Home Cleaning category selected.",
      },
    },
  },
};

/** Shows the form with car/auto category. */
export const CarAutoCategory: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedPdfScan],
      selectedScans: [],
    });
  },
  render: () => (
    <InvoiceDetailsFormWithPrefill
      scansToSelect={[storyCachedPdfScan]}
      name='Car Maintenance Service'
      category={InvoiceCategory.CAR_AUTO}
      paymentType={PaymentType.Card}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Form with Car/Auto category selected - demonstrates automotive category handling.",
      },
    },
  },
};

/** Shows the form with PDF scan. */
export const WithPdfScan: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedPdfScan],
      selectedScans: [],
    });
  },
  render: () => <InvoiceDetailsFormWithSelection scansToSelect={[storyCachedPdfScan]} />,
  parameters: {
    docs: {
      description: {
        story: "Form with PDF scan preview - demonstrates PDF thumbnail placeholder rendering.",
      },
    },
  },
};

/** Shows the form with cash payment type. */
export const CashPayment: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <InvoiceDetailsFormWithPrefill
      scansToSelect={[storyCachedImageScan]}
      name='Local Market'
      category={InvoiceCategory.GROCERY}
      paymentType={PaymentType.Cash}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Form with Cash payment type selected - demonstrates payment type dropdown.",
      },
    },
  },
};

/** Shows the form with empty required name field. */
export const EmptyRequiredField: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({
      scans: [storyCachedImageScan],
      selectedScans: [],
    });
  },
  render: () => (
    <InvoiceDetailsFormWithPrefill
      scansToSelect={[storyCachedImageScan]}
      name=''
      category={InvoiceCategory.GROCERY}
      paymentType={PaymentType.Card}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Form with empty required name field - demonstrates validation state.",
      },
    },
  },
};
