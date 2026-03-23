import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {FormSkeleton} from "./form-skeleton";

const meta = {
  title: "Components/Feedback/FormSkeleton",
  component: FormSkeleton,
  tags: ["autodocs"],
  argTypes: {
    fields: {
      control: {type: "range", min: 1, max: 10, step: 1},
      description: "Number of labeled field placeholders rendered before the submit action",
    },
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

/**
 * Form skeleton in a card container.
 */
export const InCard: Story = {
  render: () => (
    <div
      style={{
        maxWidth: "500px",
        padding: "2rem",
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}>
      <h2 style={{marginBottom: "1.5rem", fontSize: "1.5rem", fontWeight: "600"}}>Loading Form...</h2>
      <FormSkeleton
        fields={5}
        aria-label='Loading profile form'
      />
    </div>
  ),
};
