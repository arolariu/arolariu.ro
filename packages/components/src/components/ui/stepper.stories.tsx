import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Stepper} from "./stepper";

const meta = {
  title: "Components/Data Display/Stepper",
  component: Stepper,
  tags: ["autodocs"],
  argTypes: {
    activeStep: {
      control: {type: "number", min: 0, max: 3},
      description: "Current active step (0-indexed)",
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Layout orientation",
    },
  },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HorizontalFirstStep: Story = {
  args: {
    steps: ["Account", "Profile", "Review", "Complete"],
    activeStep: 0,
    orientation: "horizontal",
  },
};

export const HorizontalSecondStep: Story = {
  args: {
    steps: ["Account", "Profile", "Review", "Complete"],
    activeStep: 1,
    orientation: "horizontal",
  },
};

export const HorizontalLastStep: Story = {
  args: {
    steps: ["Account", "Profile", "Review", "Complete"],
    activeStep: 3,
    orientation: "horizontal",
  },
};

export const VerticalFirstStep: Story = {
  args: {
    steps: ["Account", "Profile", "Review", "Complete"],
    activeStep: 0,
    orientation: "vertical",
  },
};

export const VerticalSecondStep: Story = {
  args: {
    steps: ["Account", "Profile", "Review", "Complete"],
    activeStep: 1,
    orientation: "vertical",
  },
};

/**
 * Stepper showing error state on a specific step.
 */
export const WithErrors: Story = {
  render: () => (
    <div style={{width: "400px"}}>
      <Stepper
        steps={["Account", "Profile", "Review", "Complete"]}
        activeStep={1}
        orientation='horizontal'
      />
      <div
        style={{
          marginTop: "1rem",
          padding: "0.75rem",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "6px",
        }}>
        <p style={{fontSize: "0.875rem", color: "#dc2626", fontWeight: "500"}}>⚠️ Error on step 2: Profile information is incomplete</p>
      </div>
    </div>
  ),
};

function ClickableStepperContent(): React.JSX.Element {
  const [activeStep, setActiveStep] = React.useState(2);

  return (
    <div style={{width: "400px"}}>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          cursor: "pointer",
        }}>
        {["Account", "Profile", "Review", "Complete"].map((label, index) => {
          const isCompleted = index < activeStep;
          const isActive = index === activeStep;

          return (
            <div
              key={label}
              onClick={() => {
                if (index <= activeStep) {
                  setActiveStep(index);
                }
              }}
              style={{
                flex: 1,
                padding: "0.75rem",
                textAlign: "center",
                fontSize: "0.875rem",
                fontWeight: "500",
                background: isActive ? "#3b82f6" : isCompleted ? "#dbeafe" : "#f3f4f6",
                color: isActive ? "white" : isCompleted ? "#1e40af" : "#6b7280",
                borderRadius: "6px",
                cursor: isCompleted || isActive ? "pointer" : "not-allowed",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (isCompleted || isActive) {
                  e.currentTarget.style.opacity = "0.8";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}>
              {label}
            </div>
          );
        })}
      </div>
      <p style={{marginTop: "1rem", fontSize: "0.875rem", color: "#6b7280"}}>Click on completed steps to navigate back</p>
    </div>
  );
}

/**
 * Stepper where clicking a completed step navigates back.
 */
export const Clickable: Story = {
  render: () => <ClickableStepperContent />,
};
