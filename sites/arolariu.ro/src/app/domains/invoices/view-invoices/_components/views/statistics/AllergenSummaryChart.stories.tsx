import type {Meta, StoryObj} from "@storybook/react";
import type {AllergenFrequency} from "../../../_utils/statistics";
import {AllergenSummaryChart} from "./AllergenSummaryChart";

/**
 * AllergenSummaryChart displays EU-14 canonical allergen frequencies across assessed products.
 *
 * ## Features
 * - Compact card grid layout using canonical EU-14 allergen codes
 * - Color-coded warning levels (high/medium/low)
 * - Shows product count and percentage of **assessed** products
 * - Unassessed products are excluded from the denominator
 * - Empty state when no allergens detected in assessed products
 */
const meta = {
  title: "Invoices/Statistics/AllergenSummaryChart",
  component: AllergenSummaryChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes EU-14 allergen signals across assessed products. Unassessed products are excluded from the denominator — the chart never implies allergen absence for unassessed products.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of allergen frequencies (canonical EU-14 codes, assessed products only)",
      control: false,
    },
  },
} satisfies Meta<typeof AllergenSummaryChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const diverseData: AllergenFrequency[] = [
  {code: "milk", productCount: 8, percentage: 40},
  {code: "cerealsContainingGluten", productCount: 7, percentage: 35},
  {code: "eggs", productCount: 5, percentage: 25},
  {code: "soybeans", productCount: 3, percentage: 15},
  {code: "peanuts", productCount: 2, percentage: 10},
  {code: "nuts", productCount: 1, percentage: 5},
];

const singleAllergenData: AllergenFrequency[] = [
  {code: "milk", productCount: 3, percentage: 30},
];

const highWarningData: AllergenFrequency[] = [
  {code: "cerealsContainingGluten", productCount: 12, percentage: 60},
  {code: "milk", productCount: 10, percentage: 50},
  {code: "eggs", productCount: 8, percentage: 40},
  {code: "soybeans", productCount: 5, percentage: 25},
];

const lowFrequencyData: AllergenFrequency[] = [
  {code: "sesame", productCount: 1, percentage: 3},
  {code: "mustard", productCount: 1, percentage: 3},
  {code: "celery", productCount: 1, percentage: 2},
];

/** Default view with diverse allergens across several EU-14 codes. */
export const Default: Story = {
  args: {
    data: diverseData,
  },
};

/** Empty state — no allergens detected in assessed products. */
export const Empty: Story = {
  args: {
    data: [],
  },
};

/** Single allergen. */
export const SingleAllergen: Story = {
  args: {
    data: singleAllergenData,
  },
};

/** High warning levels — several allergens at ≥20%. */
export const HighWarningLevels: Story = {
  args: {
    data: highWarningData,
  },
};

/** Low frequency allergens — all below 10% threshold. */
export const LowFrequency: Story = {
  args: {
    data: lowFrequencyData,
  },
};

/** All 14 EU allergen codes present. */
export const AllCodes: Story = {
  args: {
    data: [
      {code: "cerealsContainingGluten", productCount: 10, percentage: 50},
      {code: "crustaceans", productCount: 2, percentage: 10},
      {code: "eggs", productCount: 7, percentage: 35},
      {code: "fish", productCount: 4, percentage: 20},
      {code: "peanuts", productCount: 3, percentage: 15},
      {code: "soybeans", productCount: 5, percentage: 25},
      {code: "milk", productCount: 9, percentage: 45},
      {code: "nuts", productCount: 2, percentage: 10},
      {code: "celery", productCount: 1, percentage: 5},
      {code: "mustard", productCount: 1, percentage: 5},
      {code: "sesame", productCount: 2, percentage: 10},
      {code: "sulphurDioxideAndSulphites", productCount: 3, percentage: 15},
      {code: "lupin", productCount: 1, percentage: 5},
      {code: "molluscs", productCount: 1, percentage: 5},
    ],
  },
};
