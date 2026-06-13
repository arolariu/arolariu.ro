import type {Meta, StoryObj} from "@storybook/react";
import {WithViewInvoiceContext, storyInvoice} from "@/app/domains/invoices/_storybook";
import {AnalysisPanel} from "./AnalysisPanel";

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
  title: "arolariu.ro/IMS/ViewInvoice/Cards/Invoice/AnalysisPanel",
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
} satisfies Meta<typeof AnalysisPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default state: invoice has items (panel hidden by default).
 *
 * **Story Description:**
 * When invoice has items, the AnalysisPanel is hidden as analysis is already complete.
 * This story shows the empty state.
 */
export const Default: Story = {
  render: () => {
    const invoice = {
      ...storyInvoice,
      items: storyInvoice.items.slice(0, 5),
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
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
  render: () => {
    const invoice = {
      ...storyInvoice,
      items: [],
      lastUpdatedAt: analyzedTwoHoursAgo,
      numberOfUpdates: 1,
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
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
  render: () => {
    const invoice = {
      ...storyInvoice,
      items: [],
      lastUpdatedAt: storyInvoice.createdAt,
      numberOfUpdates: 0,
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
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
  render: () => {
    const invoice = {
      ...storyInvoice,
      items: [],
      lastUpdatedAt: analyzedThirtyMinutesAgo,
      numberOfUpdates: 5,
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
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
  render: () => {
    const invoice = {
      ...storyInvoice,
      items: [],
      createdAt: recentlyCreated,
      lastUpdatedAt: recentlyCreated,
      numberOfUpdates: 0,
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
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
  render: () => {
    const invoice = {
      ...storyInvoice,
      items: [],
      lastUpdatedAt: analyzedSevenDaysAgo,
      numberOfUpdates: 2,
    };

    return (
      <WithViewInvoiceContext invoice={invoice}>
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
