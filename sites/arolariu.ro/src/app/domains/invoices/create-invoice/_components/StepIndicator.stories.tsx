import type {Meta, StoryObj} from "@storybook/react";
import React from "react";
import {resetInvoiceStoryStores, seedInvoiceStoryStores, WithCreateInvoiceContext} from "../../_storybook";
import {useCreateInvoiceContext} from "../_context/CreateInvoiceContext";
import StepIndicator from "./StepIndicator";

/**
 * Wrapper that sets the current step via context.
 */
function StepIndicatorWithStep({step}: Readonly<{step: "select-scans" | "details" | "review"}>): React.JSX.Element {
  const {goToStep} = useCreateInvoiceContext();

  // Set the step on mount
  React.useEffect(() => {
    goToStep(step);
  }, [step, goToStep]);

  return <StepIndicator />;
}

const meta = {
  title: "arolariu.ro/IMS/Forms/StepIndicator",
  component: StepIndicator,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Visual step indicator for the 3-step invoice creation wizard. Shows numbered step circles with icons, step labels, connecting lines, and visual states (completed, active, upcoming). Context-aware component that reads current step from CreateInvoiceContext.",
      },
    },
  },
  decorators: [
    (Story) => (
      <WithCreateInvoiceContext>
        <div style={{padding: "2rem", width: "800px"}}>
          <Story />
        </div>
      </WithCreateInvoiceContext>
    ),
  ],
} satisfies Meta<typeof StepIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectScansStep: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({scans: [], selectedScans: []});
  },
  render: () => <StepIndicatorWithStep step='select-scans' />,
  parameters: {
    docs: {
      description: {
        story: "Shows the indicator at step 1 (Select Scans) - first circle is active, others are upcoming.",
      },
    },
  },
};

export const DetailsStep: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({scans: [], selectedScans: []});
  },
  render: () => <StepIndicatorWithStep step='details' />,
  parameters: {
    docs: {
      description: {
        story:
          "Shows the indicator at step 2 (Invoice Details) - first circle is completed (checkmark), second is active, third is upcoming.",
      },
    },
  },
};

export const ReviewStep: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({scans: [], selectedScans: []});
  },
  render: () => <StepIndicatorWithStep step='review' />,
  parameters: {
    docs: {
      description: {
        story: "Shows the indicator at step 3 (Review) - first two circles are completed, third is active.",
      },
    },
  },
};

/** Shows the indicator at the first step with one scan available. */
export const FirstStepWithScan: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({scans: [], selectedScans: []});
  },
  render: () => <StepIndicatorWithStep step='select-scans' />,
  parameters: {
    docs: {
      description: {
        story: "Step indicator at the initial scan selection step - demonstrates the starting state of the wizard.",
      },
    },
  },
};

/** Shows the indicator at the middle step (details) - first step completed, last step upcoming. */
export const MiddleStepActive: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({scans: [], selectedScans: []});
  },
  render: () => <StepIndicatorWithStep step='details' />,
  parameters: {
    docs: {
      description: {
        story: "Middle step (Invoice Details) is active - shows transition between completed and upcoming steps.",
      },
    },
  },
};

/** Shows the indicator at the last step - all previous steps completed. */
export const LastStepActive: Story = {
  beforeEach: () => {
    resetInvoiceStoryStores();
    seedInvoiceStoryStores({scans: [], selectedScans: []});
  },
  render: () => <StepIndicatorWithStep step='review' />,
  parameters: {
    docs: {
      description: {
        story: "Final review step is active - all previous steps show completion checkmarks.",
      },
    },
  },
};
