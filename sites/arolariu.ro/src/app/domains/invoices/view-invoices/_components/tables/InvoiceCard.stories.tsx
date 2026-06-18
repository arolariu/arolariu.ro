import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {
  invoicePresets,
  resetInvoiceStoryStores,
  seedInvoiceStoryStores,
  storyHugeInvoice,
  storyInvoice,
  withEntityPreset,
  WithInvoiceDialogs,
} from "../../../_storybook";
import {InvoiceCard} from "./InvoiceCard";

type StoryArgs = {
  invoice: Invoice;
  invoicePreset: "standard" | "public";
  isSelected: boolean;
  loading: "eager" | "lazy";
  onToggleSelection: (invoiceId: string) => void;
};

/**
 * InvoiceCard displays one invoice as a grid card with scan carousel.
 *
 * This story mounts the real InvoiceCard component with various invoice configurations.
 * Wrapped with DialogProvider to provide required dialog context.
 */
const meta = {
  title: "arolariu.ro/IMS/Tables/Invoice/InvoiceCard",
  component: InvoiceCard,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
    isSelected: {control: "boolean"},
    loading: {control: "select", options: ["eager", "lazy"]},
    onToggleSelection: {action: "onToggleSelection"},
  },
  args: {
    invoicePreset: "standard",
    invoice: storyInvoice,
    isSelected: false,
    loading: "eager",
    onToggleSelection: (invoiceId: string) => {
      console.log("Toggle selection for invoice:", invoiceId);
    },
  },
  decorators: [
    withEntityPreset("invoicePreset", "invoice", invoicePresets),
    (Story) => {
      resetInvoiceStoryStores();
      seedInvoiceStoryStores();
      return (
        <WithInvoiceDialogs>
          <div style={{maxWidth: "400px"}}>
            <Story />
          </div>
        </WithInvoiceDialogs>
      );
    },
  ],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default invoice card with scans.
 */
export const Default: Story = {};

/**
 * Selected invoice card.
 */
export const Selected: Story = {
  args: {
    isSelected: true,
  },
};

/**
 * Invoice card with no scans.
 */
export const NoScans: Story = {
  args: {
    invoicePreset: "public",
    invoice: {
      ...invoicePresets["public"],
      scans: [],
    } as Invoice,
  },
};

/**
 * Important invoice card (flagged) to show the importance indicator.
 */
export const Important: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      isImportant: true,
    } as Invoice,
  },
};

/**
 * Invoice card with a very long name to exercise title truncation.
 */
export const LongName: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      name: "Monthly Bulk Grocery & Household Supplies Shopping Trip - Mega Image Militari - March 2024",
    } as Invoice,
  },
};

/**
 * Invoice card with huge number of items (120) to test item count display.
 */
export const HugeItemCount: Story = {
  args: {
    invoice: storyHugeInvoice,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Invoice card displaying an invoice with 120 line items. Tests item count display and performance with large invoice metadata.",
      },
    },
  },
};

/**
 * Invoice card with lazy loading.
 */
export const LazyLoading: Story = {
  args: {
    loading: "lazy",
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card with lazy image loading. Tests loading attribute and performance optimization for off-screen cards.",
      },
    },
  },
};

/**
 * Important and selected invoice card — combined states.
 */
export const ImportantAndSelected: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      isImportant: true,
    } as Invoice,
    isSelected: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card that is both important and selected. Tests combined state rendering and visual hierarchy.",
      },
    },
  },
};

/** Invoice with EUR currency. */
export const EuroCurrency: Story = {
  args: {
    invoice: {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        currency: {code: "EUR", name: "Euro", symbol: "€"},
      },
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card with EUR currency to verify currency symbol display.",
      },
    },
  },
};

/** Invoice with USD currency. */
export const UsdCurrency: Story = {
  args: {
    invoice: {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        currency: {code: "USD", name: "US Dollar", symbol: "$"},
      },
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card with USD currency to verify dollar symbol display.",
      },
    },
  },
};

/** Invoice with zero total amount. */
export const ZeroAmount: Story = {
  args: {
    invoice: {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        totalCostAmount: 0,
        subtotalAmount: 0,
        totalTaxAmount: 0,
        tipAmount: 0,
      },
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card with zero total amount to test edge-case formatting.",
      },
    },
  },
};

/** Soft-deleted invoice. */
export const SoftDeleted: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      isSoftDeleted: true,
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Soft-deleted invoice card to verify deletion markers.",
      },
    },
  },
};

/** Invoice shared with many users — overflow test. */
export const SharedWithManyUsers: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      sharedWith: Array.from({length: 12}, (_, i) => `user-${String(i).padStart(3, "0")}`),
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice shared with 12 users to test multi-user display.",
      },
    },
  },
};

/** Invoice with future date. */
export const FutureDate: Story = {
  args: {
    invoice: {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date("2099-12-31T10:00:00.000Z"),
      },
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with future transaction date to test date edge case.",
      },
    },
  },
};

/** Invoice with epoch date. */
export const EpochDate: Story = {
  args: {
    invoice: {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        transactionDate: new Date(0),
      },
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with epoch date (1970-01-01) to test date edge case.",
      },
    },
  },
};

/** Invoice with tip. */
export const WithTip: Story = {
  args: {
    invoice: {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        tipAmount: 15.0,
        totalCostAmount: 115.0,
      },
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with tip amount to test payment breakdown.",
      },
    },
  },
};

/** Invoice with GBP currency. */
export const GbpCurrency: Story = {
  args: {
    invoice: {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        currency: {code: "GBP", name: "Pound Sterling", symbol: "£"},
      },
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card with GBP currency to verify pound symbol display.",
      },
    },
  },
};

/** Invoice with large total amount — number formatting. */
export const LargeAmount: Story = {
  args: {
    invoice: {
      ...storyInvoice,
      paymentInformation: {
        ...storyInvoice.paymentInformation,
        totalCostAmount: 1_234_567.89,
        subtotalAmount: 1_037_037.03,
        totalTaxAmount: 197_530.86,
      },
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card with large total amount to test number formatting with thousand separators.",
      },
    },
  },
};

/** Important and soft-deleted invoice. */
export const ImportantAndSoftDeleted: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      isImportant: true,
      isSoftDeleted: true,
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card that is both important and soft-deleted. Tests combined flag rendering.",
      },
    },
  },
};

/** Invoice with single scan. */
export const SingleScan: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      scans: (invoicePresets["standard"]?.scans ?? []).slice(0, 1),
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card with a single scan. Tests carousel without navigation controls.",
      },
    },
  },
};

/** Invoice with many scans (carousel overflow). */
export const ManyScans: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      scans: Array.from({length: 8}, (_, i) => {
        const baseScan = invoicePresets["standard"]?.scans?.[0];
        return baseScan
          ? {
              ...baseScan,
              location: `${baseScan.location}?scan=${i + 1}`,
            }
          : undefined;
      }).filter((scan): scan is NonNullable<typeof scan> => scan !== undefined),
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card with 8 scans. Tests carousel navigation and scroll performance.",
      },
    },
  },
};

/** Invoice with no items (empty items array). */
export const NoItems: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      items: [],
      paymentInformation: {
        ...(invoicePresets["standard"]?.paymentInformation ?? storyInvoice.paymentInformation),
        totalCostAmount: 0,
        subtotalAmount: 0,
        totalTaxAmount: 0,
      },
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card with no items. Tests zero-item count display and empty state rendering.",
      },
    },
  },
};

/** Invoice with many updates (high edit count). */
export const ManyUpdates: Story = {
  args: {
    invoice: {
      ...invoicePresets["standard"],
      numberOfUpdates: 42,
    } as Invoice,
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice card with many edits/updates. Tests update counter display and overflow handling.",
      },
    },
  },
};
