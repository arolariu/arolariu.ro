import {AllergenAssessmentStatus, AllergenCode, AllergenEvidenceLevel, type AllergenAssessment} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {AllergenAssessmentEditor} from "./AllergenAssessmentEditor";

const detectedAssessment: AllergenAssessment = {
  status: AllergenAssessmentStatus.Detected,
  signals: [
    {
      code: AllergenCode.Milk,
      evidenceLevel: AllergenEvidenceLevel.Explicit,
      confidence: 0.92,
      evidence: [{source: "productLabel", value: "contains milk"}],
    },
  ],
};

const meta = {
  title: "Invoices/Allergens/AllergenAssessmentEditor",
  component: AllergenAssessmentEditor,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Constrained editor for the EU-14 allergen assessment contract. Incomplete evidence remains local until it is valid.",
      },
    },
  },
  tags: ["autodocs"],
  args: {
    onChange: () => undefined,
  },
} satisfies Meta<typeof AllergenAssessmentEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A product that has not yet been assessed. */
export const NotAssessed: Story = {
  args: {
    value: null,
  },
};

/** An existing detected signal with explicit label evidence. */
export const Detected: Story = {
  args: {
    value: detectedAssessment,
  },
};

/** A completed assessment that produced no signals. */
export const NoSignals: Story = {
  args: {
    value: {
      status: AllergenAssessmentStatus.NoSignals,
      signals: [],
    },
  },
};
