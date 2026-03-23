import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {TypewriterText, TypewriterTextSmooth} from "./typewriter";

const meta = {
  title: "Components/Typography/Typewriter",
  component: TypewriterText,
  tags: ["autodocs"],
} satisfies Meta<typeof TypewriterText>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Stepped typewriter animation revealing characters one by one.
 */
export const Default: Story = {
  args: {
    words: [{text: "Welcome"}, {text: "to"}, {text: "the"}, {text: "future"}],
  },
};

/**
 * Typewriter with custom styled words.
 */
export const StyledWords: Story = {
  args: {
    words: [
      {text: "Build", className: "text-blue-500"},
      {text: "amazing", className: "text-purple-500"},
      {text: "applications", className: "text-pink-500"},
    ],
  },
  render: (args) => (
    <div style={{fontSize: "2rem", fontWeight: "bold"}}>
      <TypewriterText {...args} />
    </div>
  ),
};

/**
 * Smooth continuous typewriter animation.
 */
export const Smooth: Story = {
  render: () => (
    <div style={{fontSize: "1.5rem", fontWeight: "600"}}>
      <TypewriterTextSmooth words={[{text: "Smooth"}, {text: "typing"}, {text: "animation"}]} />
    </div>
  ),
};

/**
 * Typewriter with longer content.
 */
export const LongText: Story = {
  render: () => (
    <div style={{fontSize: "1.25rem"}}>
      <TypewriterText
        words={[{text: "Experience"}, {text: "the"}, {text: "power"}, {text: "of"}, {text: "modern"}, {text: "web"}, {text: "development"}]}
      />
    </div>
  ),
};
