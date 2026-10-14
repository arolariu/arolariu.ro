import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {FormSkeleton} from "./form-skeleton";
const storyStyles = `
.ac-story-form-skeleton-storyPreview {
  width: 32rem;
  max-width: 100%;
}

.ac-story-form-skeleton-storyPanel {
  padding: var(--ac-space-6);
  border: 1px solid var(--ac-border);
  border-radius: var(--ac-radius-lg);
  background-color: var(--ac-background);
  color: var(--ac-foreground);
}

.ac-story-form-skeleton-storyHeading {
  margin: 0 0 var(--ac-space-6);
  font-size: 1.25rem;
  font-weight: 600;
}
`;

const storyClasses = {
  storyPreview: "ac-story-form-skeleton-storyPreview",
  storyPanel: "ac-story-form-skeleton-storyPanel",
  storyHeading: "ac-story-form-skeleton-storyHeading",
} as const;

const meta = {
  title: "Components/Feedback/FormSkeleton",
  component: FormSkeleton,
  tags: ["autodocs"],
  args: {
    role: "status",
    "aria-label": "Loading form",
    "aria-busy": true,
  },
  decorators: [
    (Story) => (
      <div className={storyClasses.storyPreview}>
        <Story />
      </div>
    ),

    (Story) => (
      <>
        <style>{storyStyles}</style>
        <Story />
      </>
    ),
  ],
  argTypes: {
    fields: {
      control: {type: "range", min: 0, max: 10, step: 1},
      description: "Fields: integer 0–10,000; invalid values throw RangeError. This demo limits the slider to 10.",
    },
    animated: {control: "boolean", description: "Shared Skeleton motion; reduced-motion preferences always keep it static"},
  },
} satisfies Meta<typeof FormSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Form skeleton with default 4 fields.
 */
export const Default: Story = {
  args: {
    fields: 4,
  },
};

/**
 * Short form skeleton with minimal fields.
 */
export const Short: Story = {
  args: {
    fields: 2,
  },
};

/**
 * Long form skeleton with many fields.
 */
export const Long: Story = {
  args: {
    fields: 8,
  },
};

/** Zero fields retain only the submit action shape. */
export const EmptyFields: Story = {
  args: {fields: 0},
};

/** Explicitly static placeholders retain their visible loading surface. */
export const Static: Story = {
  args: {animated: false},
};

/**
 * Form skeleton in a card container.
 */
export const InCard: Story = {
  render: () => (
    <section
      className={storyClasses.storyPanel}
      role='status'
      aria-labelledby='form-skeleton-heading'
      aria-busy>
      <h2
        id='form-skeleton-heading'
        className={storyClasses.storyHeading}>
        Loading form
      </h2>
      <FormSkeleton fields={5} />
    </section>
  ),
};
