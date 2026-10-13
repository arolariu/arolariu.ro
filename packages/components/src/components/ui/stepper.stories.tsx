import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Stepper} from "./stepper";
import styles from "./stepper.module.css";

const steps = ["Start", "Configure", "Review", "Complete"];
const meta = {
  title: "Components/Data Display/Stepper",
  component: Stepper,
  tags: ["autodocs"],
  args: {steps, activeStep: 0},
  argTypes: {
    activeStep: {control: {type: "number", min: 0, max: 4}},
    orientation: {control: "select", options: ["horizontal", "vertical"]},
  },
} satisfies Meta<typeof Stepper>;
export default meta;
type Story = StoryObj<typeof meta>;

export const HorizontalFirstStep: Story = {};
export const HorizontalSecondStep: Story = {args: {activeStep: 1}};
export const HorizontalLastStep: Story = {args: {activeStep: 3}};
export const VerticalFirstStep: Story = {args: {orientation: "vertical"}};
export const VerticalSecondStep: Story = {args: {orientation: "vertical", activeStep: 1}};
export const Completed: Story = {args: {activeStep: steps.length}};
export const WithErrors: Story = {
  render: () => (
    <div className={styles.storyStack}>
      <Stepper
        steps={steps}
        activeStep={1}
      />
      <p
        role='alert'
        className={styles.storyError}>
        Configuration is incomplete.
      </p>
    </div>
  ),
};

function ClickableStepperContent(): React.JSX.Element {
  const [activeStep, setActiveStep] = React.useState(1);
  return (
    <div className={styles.storyStack}>
      <Stepper
        steps={steps}
        activeStep={activeStep}
        aria-label='Configuration progress'
      />
      <div className={styles.storyActions}>
        <Button
          size='sm'
          variant='secondary'
          disabled={activeStep === 0}
          onClick={() => setActiveStep((step) => Math.max(0, step - 1))}>
          Previous
        </Button>
        <Button
          size='sm'
          disabled={activeStep === steps.length}
          onClick={() => setActiveStep((step) => Math.min(steps.length, step + 1))}>
          Next
        </Button>
      </div>
    </div>
  );
}
/** Native controls change the active step and its actual accessible state. */
export const Clickable: Story = {render: () => <ClickableStepperContent />};
