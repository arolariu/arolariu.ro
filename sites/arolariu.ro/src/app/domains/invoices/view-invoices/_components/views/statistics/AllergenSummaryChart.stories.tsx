import type {Meta, StoryObj} from "@storybook/react";
import type {Invoice, Product} from "../../../../../../../types/invoices";
import type {AllergenFrequency} from "../../../_utils/statistics";
import {computeAllergenFrequency} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {AllergenSummaryChart} from "./AllergenSummaryChart";

type StoryArgs = {data: AllergenFrequency[]};

/**
 * AllergenSummaryChart displays allergen frequency across products.
 *
 * ## Features
 * - Compact card grid layout
 * - Color-coded warning levels (high/medium/low)
 * - Shows product count and percentage
 * - Alert icons for visibility
 * - Positive empty state message
 *
 * ## Use Cases
 * - Dietary risk assessment
 * - Allergen exposure tracking
 * - Product safety awareness
 */
const meta = {
  title: "arolariu.ro/IMS/Statistics/Products/AllergenSummaryChart",
  component: AllergenSummaryChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes allergen occurrences across all products to help users identify dietary risks. Uses color-coded warning levels (red ≥20%, yellow 10-19%, blue <10%) and displays product count with percentage.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {control: "object"},
  },
  args: {
    data: computeAllergenFrequency(mockInvoices),
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default view with diverse allergens.
 * Shows common allergens found across all products (gluten, lactose, etc.).
 */
export const Default: Story = {};

/**
 * Empty state - no allergens detected.
 * Displays positive checkmark message when products are allergen-free.
 */
export const Empty: Story = {
  args: {
    data: computeAllergenFrequency(emptyInvoices),
  },
};

/**
 * Single invoice - limited allergen data.
 * Shows allergen summary for one invoice's products.
 */
export const SingleInvoice: Story = {
  args: {
    data: computeAllergenFrequency(singleInvoice),
  },
};

/**
 * High warning levels - many allergens.
 * Demonstrates chart with multiple high-frequency allergens (≥20%).
 */
export const HighWarningLevels: Story = {
  args: {
    data: computeAllergenFrequency(
      mockInvoices.filter((inv: Invoice) => inv.items.some((item: Product) => item.detectedAllergens.length > 0)),
    ),
  },
};

/**
 * Gluten-heavy products.
 * Shows scenario where gluten is the dominant allergen.
 */
export const GlutenFocused: Story = {
  args: {
    data: computeAllergenFrequency(
      mockInvoices.filter((inv: Invoice) =>
        inv.items.some((item: Product) => item.detectedAllergens.some((a: {name: string}) => a.name.toLowerCase().includes("gluten"))),
      ),
    ),
  },
};

/**
 * Dairy allergens prominent.
 * Emphasizes lactose/dairy-related allergens.
 */
export const DairyFocused: Story = {
  args: {
    data: computeAllergenFrequency(
      mockInvoices.filter((inv: Invoice) =>
        inv.items.some((item: Product) => item.detectedAllergens.some((a: {name: string}) => a.name.toLowerCase().includes("lactose"))),
      ),
    ),
  },
};

/**
 * Few allergens - low diversity.
 * Shows chart with only 1-2 allergen types.
 */
export const FewAllergens: Story = {
  args: {
    data: computeAllergenFrequency(mockInvoices.slice(0, 2)),
  },
};

/**
 * Medium warning levels.
 * Demonstrates allergens in the 10-19% range (yellow warnings).
 */
export const MediumWarnings: Story = {
  args: {
    data: computeAllergenFrequency(mockInvoices.slice(2, 8)),
  },
};

/** Many allergens — high volume of 15+ distinct allergen types. */
export const ManyAllergens: Story = {
  args: {
    data: computeAllergenFrequency(mockInvoices),
  },
};

/** Single allergen type — minimal warning card. */
export const SingleAllergen: Story = {
  args: {
    data: computeAllergenFrequency(
      mockInvoices.filter((inv: Invoice) => inv.items.some((item: Product) => item.detectedAllergens.length > 0)),
    ).slice(0, 1),
  },
};

/** Two allergen types — minimal comparison view. */
export const TwoAllergens: Story = {
  args: {
    data: computeAllergenFrequency(
      mockInvoices.filter((inv: Invoice) => inv.items.some((item: Product) => item.detectedAllergens.length > 0)),
    ).slice(0, 2),
  },
};

/** Three allergen types — balanced warning card grid. */
export const ThreeAllergens: Story = {
  args: {
    data: computeAllergenFrequency(
      mockInvoices.filter((inv: Invoice) => inv.items.some((item: Product) => item.detectedAllergens.length > 0)),
    ).slice(0, 3),
  },
};

/** Four allergen types — compact warning overview. */
export const FourAllergens: Story = {
  args: {
    data: computeAllergenFrequency(
      mockInvoices.filter((inv: Invoice) => inv.items.some((item: Product) => item.detectedAllergens.length > 0)),
    ).slice(0, 4),
  },
};

/** All low-frequency allergens — all blue warning cards. */
export const AllLowFrequency: Story = {
  args: {
    data: computeAllergenFrequency(mockInvoices.slice(5, 15)),
  },
};

/** Dense allergen data — 20+ distinct allergens across many products. */
export const DenseAllergenData: Story = {
  args: {
    data: computeAllergenFrequency(mockInvoices),
  },
};

/** Soy-heavy products — soy allergen prominence test. */
export const SoyFocused: Story = {
  args: {
    data: computeAllergenFrequency(
      mockInvoices.filter((inv: Invoice) =>
        inv.items.some((item: Product) => item.detectedAllergens.some((a: {name: string}) => a.name.toLowerCase().includes("soy"))),
      ),
    ),
  },
};

/** Nut allergen products — tree nut allergen filter. */
export const NutAllergens: Story = {
  args: {
    data: computeAllergenFrequency(
      mockInvoices.filter((inv: Invoice) =>
        inv.items.some((item: Product) =>
          item.detectedAllergens.some(
            (a: {name: string}) =>
              a.name.toLowerCase().includes("nut") || a.name.toLowerCase().includes("almond") || a.name.toLowerCase().includes("peanut"),
          ),
        ),
      ),
    ),
  },
};

/** Shellfish allergen focus — seafood allergen tracking. */
export const ShellfishFocused: Story = {
  args: {
    data: computeAllergenFrequency(
      mockInvoices.filter((inv: Invoice) =>
        inv.items.some((item: Product) =>
          item.detectedAllergens.some(
            (a: {name: string}) => a.name.toLowerCase().includes("shellfish") || a.name.toLowerCase().includes("seafood"),
          ),
        ),
      ),
    ),
  },
};

/** Mixed allergen levels — diverse warning severity. */
export const MixedAllergenLevels: Story = {
  args: {
    data: computeAllergenFrequency(mockInvoices),
  },
};
