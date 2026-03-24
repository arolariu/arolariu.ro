import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {HighlightText} from "./highlight-text";

const meta = {
  title: "Components/Typography/HighlightText",
  component: HighlightText,
  tags: ["autodocs"],
  argTypes: {
    inView: {
      control: "boolean",
      description: "Delays the highlight animation until the text enters the viewport",
    },
  },
} satisfies Meta<typeof HighlightText>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Animated gradient highlight fill behind text.
 */
export const Default: Story = {
  args: {
    text: "highlighted text",
    inView: false,
  },
  render: (args) => (
    <div style={{padding: "2rem", fontSize: "1.5rem", lineHeight: "2"}}>
      This is some content with <HighlightText {...args} /> in the middle of the paragraph.
    </div>
  ),
};

/**
 * Highlight animation triggered on scroll into view.
 */
export const OnScroll: Story = {
  args: {
    text: "important information",
    inView: true,
    inViewOnce: true,
  },
  render: (args) => (
    <div>
      <div style={{height: "100vh", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center"}}>
        <p style={{fontSize: "1.25rem"}}>Scroll down to see the highlight animation</p>
      </div>
      <div style={{padding: "2rem", fontSize: "1.5rem", lineHeight: "2", background: "#f9fafb", borderRadius: "8px"}}>
        When you scroll to this section, you'll see the <HighlightText {...args} /> appear with animation.
      </div>
    </div>
  ),
};

/**
 * Multiple highlighted text segments.
 */
export const Multiple: Story = {
  render: () => (
    <div style={{padding: "2rem", fontSize: "1.25rem", lineHeight: "2", maxWidth: "800px"}}>
      <p>
        Our platform helps you <HighlightText text='build faster' /> with modern tools, <HighlightText text='deploy easier' /> with
        automated workflows, and <HighlightText text='scale effortlessly' /> with cloud infrastructure.
      </p>
    </div>
  ),
};
