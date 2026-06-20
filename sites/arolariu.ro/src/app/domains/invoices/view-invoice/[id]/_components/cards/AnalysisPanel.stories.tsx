import {invoicePresets, storyInvoice, withEntityPreset, WithViewInvoiceContext} from "@/app/domains/invoices/_storybook";
import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {AnalysisPanel} from "./AnalysisPanel";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

const analyzedTwoHoursAgo = new Date("2024-03-15T12:30:00.000Z");
const analyzedThirtyMinutesAgo = new Date("2024-03-15T14:00:00.000Z");
const recentlyCreated = new Date("2024-03-15T14:25:00.000Z");
const analyzedSevenDaysAgo = new Date("2024-03-08T14:30:00.000Z");

/**
 * Analysis control panel for triggering invoice re-analysis.
 *
 * **Component Description:**
 * Interactive panel allowing users to trigger AI-powered invoice analysis with granular options:
 * - Complete Analysis: Full OCR + AI processing
 * - Invoice Only: Basic invoice data extraction
 * - Items Only: Line item categorization
 *
 * **Features:**
 * - Quick re-analyze button (CompleteAnalysis)
 * - Granular analysis option buttons
 * - Loading state with progress indicator
 * - Last analyzed timestamp display
 * - Success/error toast notifications
 * - Automatic page refresh on completion
 *
 * **Context Requirements:**
 * Requires InvoiceContextProvider to access invoice data.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/AnalysisPanel",
  component: AnalysisPanel,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Analysis control panel for triggering invoice re-analysis with granular options. Features progress tracking, last analyzed timestamp, and automatic page refresh on completion.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default state: invoice has items (panel hidden by default).
 *
 * **Story Description:**
 * When invoice has items, the AnalysisPanel is hidden as analysis is already complete.
 * This story shows the empty state.
 */
export const Default: Story = {
  render: ({invoice}) => {
    const invoiceWithItems = {
      ...invoice,
      items: invoice.items.slice(0, 5),
    };

    return (
      <WithViewInvoiceContext invoice={invoiceWithItems}>
        <AnalysisPanel />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Default state: invoice has items, so the AnalysisPanel is hidden (analysis already complete).",
      },
    },
  },
};

/**
 * Invoice without items - panel visible with re-analyze options.
 *
 * **Story Description:**
 * Shows the full panel when invoice has no items yet.
 * Displays last analyzed timestamp and all granular analysis options.
 */
export const WithoutItems: Story = {
  render: ({invoice}) => {
    const invoiceWithoutItems = {
      ...invoice,
      items: [],
      lastUpdatedAt: analyzedTwoHoursAgo,
      numberOfUpdates: 1,
    };

    return (
      <WithViewInvoiceContext invoice={invoiceWithoutItems}>
        <AnalysisPanel />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice without items - AnalysisPanel is visible with all granular analysis options. Shows last analyzed timestamp.",
      },
    },
  },
};

/**
 * Invoice never analyzed before.
 *
 * **Story Description:**
 * Shows the panel for an invoice that hasn't been analyzed yet.
 * Last analyzed timestamp is creation date with zero updates.
 */
export const NeverAnalyzed: Story = {
  render: ({invoice}) => {
    const invoiceNeverAnalyzed = {
      ...invoice,
      items: [],
      lastUpdatedAt: invoice.createdAt,
      numberOfUpdates: 0,
    };

    return (
      <WithViewInvoiceContext invoice={invoiceNeverAnalyzed}>
        <AnalysisPanel />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice that has never been analyzed. Last analyzed timestamp matches creation date with zero updates count.",
      },
    },
  },
};

/**
 * Invoice analyzed multiple times.
 *
 * **Story Description:**
 * Shows update count badge for invoices that have been re-analyzed several times.
 */
export const MultipleAnalyses: Story = {
  render: ({invoice}) => {
    const invoiceMultipleAnalyses = {
      ...invoice,
      items: [],
      lastUpdatedAt: analyzedThirtyMinutesAgo,
      numberOfUpdates: 5,
    };

    return (
      <WithViewInvoiceContext invoice={invoiceMultipleAnalyses}>
        <AnalysisPanel />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice that has been re-analyzed multiple times (5 updates). Displays the update count badge prominently.",
      },
    },
  },
};

/**
 * Recently created invoice awaiting first analysis.
 *
 * **Story Description:**
 * Brand new invoice created moments ago, ready for initial analysis.
 */
export const RecentlyCreated: Story = {
  render: ({invoice}) => {
    const invoiceRecentlyCreated = {
      ...invoice,
      items: [],
      createdAt: recentlyCreated,
      lastUpdatedAt: recentlyCreated,
      numberOfUpdates: 0,
    };

    return (
      <WithViewInvoiceContext invoice={invoiceRecentlyCreated}>
        <AnalysisPanel />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Recently created invoice (5 minutes ago) awaiting its first analysis run.",
      },
    },
  },
};

/**
 * Invoice analyzed long ago.
 *
 * **Story Description:**
 * Shows relative time formatting for invoices last analyzed days or weeks ago.
 */
export const AnalyzedLongAgo: Story = {
  render: ({invoice}) => {
    const invoiceAnalyzedLongAgo = {
      ...invoice,
      items: [],
      lastUpdatedAt: analyzedSevenDaysAgo,
      numberOfUpdates: 2,
    };

    return (
      <WithViewInvoiceContext invoice={invoiceAnalyzedLongAgo}>
        <AnalysisPanel />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice last analyzed 7 days ago. Demonstrates relative time formatting for older timestamps.",
      },
    },
  },
};

/** Invoice with many updates — high update count. */
export const ManyUpdates: Story = {
  render: ({invoice}) => {
    const invoiceManyUpdates = {
      ...invoice,
      items: [],
      lastUpdatedAt: analyzedThirtyMinutesAgo,
      numberOfUpdates: 25,
    };

    return (
      <WithViewInvoiceContext invoice={invoiceManyUpdates}>
        <AnalysisPanel />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice that has been re-analyzed 25 times. Tests update count badge display with high numbers.",
      },
    },
  },
};

/** Invoice analyzed just now — very recent. */
export const AnalyzedJustNow: Story = {
  render: ({invoice}) => {
    const nowDate = new Date();
    const invoiceAnalyzedNow = {
      ...invoice,
      items: [],
      lastUpdatedAt: nowDate,
      numberOfUpdates: 1,
    };

    return (
      <WithViewInvoiceContext invoice={invoiceAnalyzedNow}>
        <AnalysisPanel />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice analyzed just now (current timestamp) to test 'just now' relative time display.",
      },
    },
  },
};

/** Invoice with items but user wants to re-analyze. */
export const WithItemsReanalyze: Story = {
  render: ({invoice}) => {
    const invoiceWithItems = {
      ...invoice,
      items: invoice.items.slice(0, 3),
      numberOfUpdates: 2,
    };

    return (
      <WithViewInvoiceContext invoice={invoiceWithItems}>
        <AnalysisPanel />
      </WithViewInvoiceContext>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Invoice with items already extracted. Panel is typically hidden but story shows the component state if mounted.",
      },
    },
  },
};
