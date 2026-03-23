import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {LoadingOverlay} from "./loading-overlay";

const meta = {
  title: "Components/Feedback/LoadingOverlay",
  component: LoadingOverlay,
  tags: ["autodocs"],
  argTypes: {
    visible: {
      control: "boolean",
      description: "Whether the overlay should be rendered",
    },
    blur: {
      control: "boolean",
      description: "Whether a backdrop blur effect should be applied behind the overlay",
    },
  },
} satisfies Meta<typeof LoadingOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Loading overlay with default spinner.
 */
export const Default: Story = {
  args: {
    visible: true,
    blur: false,
  },
  render: (args) => (
    <div style={{position: "relative", height: "300px", padding: "2rem", background: "#f3f4f6", borderRadius: "8px"}}>
      <h3 style={{marginBottom: "1rem"}}>Content underneath</h3>
      <p style={{marginBottom: "0.5rem"}}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      <p>This content is blocked by the loading overlay.</p>
      <LoadingOverlay {...args} />
    </div>
  ),
};

/**
 * Loading overlay with blur effect.
 */
export const WithBlur: Story = {
  args: {
    visible: true,
    blur: true,
  },
  render: (args) => (
    <div style={{position: "relative", height: "300px", padding: "2rem", background: "#f3f4f6", borderRadius: "8px"}}>
      <h3 style={{marginBottom: "1rem"}}>Content underneath</h3>
      <p style={{marginBottom: "0.5rem"}}>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
      <p>This content is blurred by the loading overlay.</p>
      <LoadingOverlay {...args} />
    </div>
  ),
};

/**
 * Hidden loading overlay.
 */
export const Hidden: Story = {
  args: {
    visible: false,
  },
  render: (args) => (
    <div
      style={{position: "relative", height: "300px", padding: "2rem", background: "#efe", border: "1px solid #cfc", borderRadius: "8px"}}>
      <h3 style={{marginBottom: "1rem", color: "#060"}}>✓ Content is accessible</h3>
      <p style={{color: "#030"}}>The loading overlay is hidden, so this content is fully interactive.</p>
      <LoadingOverlay {...args} />
    </div>
  ),
};
