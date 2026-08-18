import type {Meta, StoryObj} from "@storybook/react";
import {computeAllergenStatistics} from "../../../_utils/statistics";
import {mockInvoices, singleInvoice, unassessedInvoices} from "./__mocks__/mockInvoices";
import {AllergenSummaryChart} from "./AllergenSummaryChart";

/**
 * AllergenSummaryChart displays allergen frequency across products.
 *
 * ## Features
 * - Compact card grid layout
 * - Color-coded assessment signal-frequency levels
 * - Shows product count and percentage
 * - Alert icons for visibility
 * - Honest empty-state coverage
 *
 * ## Use Cases
 * - Assessment signal review
 * - EU-14 signal frequency tracking
 * - Assessment coverage review
 */
const meta = {
  title: "Invoices/Statistics/AllergenSummaryChart",
  component: AllergenSummaryChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes EU-14 assessment signals across assessed products. Signal frequencies use assessed-product coverage and never imply an allergen-free result when evidence is unavailable.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of allergen frequencies sorted by product count",
      control: false,
    },
  },
} satisfies Meta<typeof AllergenSummaryChart>;

export default meta;
type Story = StoryObj<typeof meta>;

function RenderAllergenSummaryStory({invoices}: Readonly<{invoices: typeof mockInvoices}>): React.JSX.Element {
  const statistics = computeAllergenStatistics(invoices);
  return (
    <AllergenSummaryChart
      data={statistics.frequencies}
      coverage={{
        assessedProductCount: statistics.assessedProductCount,
        insufficientDataProductCount: statistics.insufficientDataProductCount,
        unassessedProductCount: statistics.unassessedProductCount,
        totalProductCount: statistics.totalProductCount,
      }}
    />
  );
}

function createStory(invoices: typeof mockInvoices): Story {
  const statistics = computeAllergenStatistics(invoices);
  return {
    args: {
      data: statistics.frequencies,
      coverage: {
        assessedProductCount: statistics.assessedProductCount,
        insufficientDataProductCount: statistics.insufficientDataProductCount,
        unassessedProductCount: statistics.unassessedProductCount,
        totalProductCount: statistics.totalProductCount,
      },
    },
    render: () => <RenderAllergenSummaryStory invoices={invoices} />,
  };
}

/**
 * Default view with assessed products and distinct EU-14 signals.
 */
export const Default: Story = createStory(mockInvoices);

/**
 * Empty signal state with incomplete and missing assessment coverage.
 */
export const Empty: Story = createStory(unassessedInvoices);

/**
 * Single invoice with one reviewed EU-14 assessment.
 */
export const SingleInvoice: Story = createStory(singleInvoice);

/**
 * A high-frequency assessment signal.
 */
export const HighSignalFrequency: Story = createStory(
  mockInvoices.filter((invoice) => invoice.items.some((item) => item.allergenAssessment?.status === "detected")),
);

/**
 * Cereals-containing-gluten assessment signal.
 */
export const CerealsContainingGluten: Story = createStory(
  mockInvoices.filter((invoice) =>
    invoice.items.some((item) => item.allergenAssessment?.signals.some((signal) => signal.code === "cerealsContainingGluten")),
  ),
);

/**
 * Milk assessment signal.
 */
export const Milk: Story = createStory(
  mockInvoices.filter((invoice) => invoice.items.some((item) => item.allergenAssessment?.signals.some((signal) => signal.code === "milk"))),
);

/**
 * A focused reviewed-product subset.
 */
export const FocusedSignals: Story = createStory(mockInvoices.slice(0, 2));

/**
 * A reviewed subset with mixed detected and no-signal outcomes.
 */
export const MixedAssessmentCoverage: Story = createStory(mockInvoices.slice(1));
