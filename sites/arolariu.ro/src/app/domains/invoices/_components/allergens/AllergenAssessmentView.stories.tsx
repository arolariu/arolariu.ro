import {AllergenAssessmentStatus, AllergenCode, AllergenEvidenceLevel, type AllergenAssessment} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {AllergenAssessmentView} from "./AllergenAssessmentView";

const detectedAssessment: AllergenAssessment = {
  status: AllergenAssessmentStatus.Detected,
  signals: [
    {
      code: AllergenCode.CerealsContainingGluten,
      evidenceLevel: AllergenEvidenceLevel.Explicit,
      confidence: 0.96,
      evidence: [{source: "productLabel", value: "contains wheat"}],
    },
    {
      code: AllergenCode.Milk,
      evidenceLevel: AllergenEvidenceLevel.Precautionary,
      confidence: 0.74,
      evidence: [{source: "productLabel", value: "may contain milk"}],
    },
  ],
};

const meta = {
  title: "Invoices/Allergens/AllergenAssessmentView",
  component: AllergenAssessmentView,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Read-only EU-14 allergen assessment with distinct unassessed, no-signal, insufficient-data, and detected states.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof AllergenAssessmentView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No assessment has run for this product. */
export const NotAssessed: Story = {
  args: {
    assessment: null,
  },
};

/** The assessment detected explicit and precautionary allergen evidence. */
export const Detected: Story = {
  args: {
    assessment: detectedAssessment,
  },
};

/** The assessment completed without finding allergen signals. */
export const NoSignals: Story = {
  args: {
    assessment: {
      status: AllergenAssessmentStatus.NoSignals,
      signals: [],
    },
  },
};

/** The source data was insufficient for an assessment. */
export const InsufficientData: Story = {
  args: {
    assessment: {
      status: AllergenAssessmentStatus.InsufficientData,
      signals: [],
    },
  },
};
