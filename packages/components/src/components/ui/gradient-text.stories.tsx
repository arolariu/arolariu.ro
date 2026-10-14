import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {GradientText} from "./gradient-text";
const storyStyles = `
.ac-story-gradient-text-demo {
  display: grid;
  place-content: center;
  padding: 3rem;
  border-radius: var(--ac-radius-lg);
  color: var(--ac-foreground);
  background: var(--ac-background);
}

.ac-story-gradient-text-demoHeading {
  font-size: clamp(1.5rem, 4vw, 3rem);
}

.ac-story-gradient-text-customGradientDemo {
  opacity: 0.9;
}
`;

const storyClasses = {
  demo: "ac-story-gradient-text-demo",
  demoHeading: "ac-story-gradient-text-demoHeading",
  customGradientDemo: "ac-story-gradient-text-customGradientDemo",
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
  title: "Components/Typography/GradientText",
  component: GradientText,
  tags: ["autodocs"],
  args: {text: "Gradient text", neon: false},
  parameters: {
    docs: {
      description: {
        component:
          "Intentional decorative text effect. Neon is an aria-hidden duplicate. Reduced motion is static; forced colors restore CanvasText glyphs and remove the neon copy.",
      },
    },
  },
  render: (args) => (
    <div className={storyClasses.demo}>
      <h2 className={storyClasses.demoHeading}>
        <GradientText {...args} />
      </h2>
    </div>
  ),
} satisfies Meta<typeof GradientText>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const WithNeon: Story = {args: {text: "Neon glow", neon: true}};
export const CustomGradient: Story = {
  args: {
    text: "Custom colors",
    gradient: "linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0, #ff0080)",
    className: storyClasses.customGradientDemo,
  },
};
/** Check one accessible copy while the original image/content semantics remain intact. */
export const WithContent: Story = {args: {text: "Related content", neon: true, children: <span> — supplementary copy</span>}};
