import type {Meta, StoryObj} from "@storybook/react";
import {ClassificationOrigin, ClassificationSystem, type StandardClassification} from "@/types/invoices";
import ClassificationBadge from "./ClassificationBadge";

const manualClassification: StandardClassification = {
  system: ClassificationSystem.EcoicopV2,
  version: "2.0",
  code: "01.1.1",
  officialLabel: "Cereals and cereal products",
  hierarchy: [
    {
      level: "division",
      code: "01",
      officialLabel: "Food and non-alcoholic beverages",
    },
    {level: "group", code: "01.1", officialLabel: "Food"},
    {
      level: "class",
      code: "01.1.1",
      officialLabel: "Cereals and cereal products",
    },
  ],
  origin: ClassificationOrigin.Manual,
  confidence: null,
  evidence: [],
};

const analysisClassification: StandardClassification = {
  system: ClassificationSystem.Gs1Gpc,
  version: "2026-05",
  code: "50202200",
  officialLabel: "Alcoholic Beverages",
  hierarchy: [
    {level: "segment", code: "50000000", officialLabel: "Food/Beverage"},
    {level: "family", code: "50200000", officialLabel: "Beverages"},
    {level: "class", code: "50202200", officialLabel: "Alcoholic Beverages"},
  ],
  origin: ClassificationOrigin.Analysis,
  confidence: 0.91,
  evidence: [],
};

/** Read-only presentation of canonical classifications and their origin. */
const meta = {
  title: "Invoices/Classification/ClassificationBadge",
  component: ClassificationBadge,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  args: {
    classification: manualClassification,
  },
} satisfies Meta<typeof ClassificationBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Classification explicitly selected by a user. */
export const Manual: Story = {};

/** Classification produced by the analysis pipeline. */
export const Analysis: Story = {
  args: {
    classification: analysisClassification,
  },
};
