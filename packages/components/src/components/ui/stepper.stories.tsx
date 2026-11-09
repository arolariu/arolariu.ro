import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Stepper} from "./stepper";

const steps = ["Start", "Configure", "Review", "Complete"];
const storyStyles = `
.ac-story-stepper-storyStack {
  display: grid;
  gap: var(--ac-space-4);
}

.ac-story-stepper-storyActions {
  display: flex;
  gap: var(--ac-space-2);
}

.ac-story-stepper-storyError {
  color: var(--ac-destructive);
}
`;

const storyClasses = {
  storyStack: "ac-story-stepper-storyStack",
  storyActions: "ac-story-stepper-storyActions",
  storyError: "ac-story-stepper-storyError",
} as const;

const meta = {
  decorators: [
    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  title: "Components/Data Display/Stepper",
  component: Stepper,
  tags: ["autodocs"],
  args: {steps, activeStep: 0},
  argTypes: {
    activeStep: {control: {type: "number", min: 0, max: 4}},
    orientation: {control: "select", options: ["horizontal", "vertical"]},
    completedLabel: {control: "text", description: "Caller-localized completion announcement; an empty string suppresses it."},
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
/** Completion announcements and the progress name are owned by the caller's locale. */
export const FrenchProgress: Story = {
  args: {
    steps: ["Démarrer", "Configurer", "Vérifier", "Terminer"],
    activeStep: 2,
    completedLabel: "Terminé",
    "aria-label": "Progression de la configuration",
  },
};
export const WithErrors: Story = {
  render: () => (
    <div className={storyClasses.storyStack}>
      <Stepper
        steps={steps}
        activeStep={1}
      />
      <p
        role='alert'
        className={storyClasses.storyError}>
        Configuration is incomplete.
      </p>
    </div>
  ),
};

function ClickableStepperContent(): React.JSX.Element {
  const [activeStep, setActiveStep] = React.useState(1);
  return (
    <div className={storyClasses.storyStack}>
      <Stepper
        steps={steps}
        activeStep={activeStep}
        aria-label='Configuration progress'
      />
      <div className={storyClasses.storyActions}>
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
