import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {GradientText} from "./gradient-text";
import styles from "./gradient-text.module.css";

const meta = {
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
    <div className={styles.demo}>
      <h2 className={styles.demoHeading}>
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
  args: {text: "Custom colors", gradient: "linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0, #ff0080)", style: {opacity: 0.9}},
};
/** Check one accessible copy while the original image/content semantics remain intact. */
export const WithContent: Story = {args: {text: "Related content", neon: true, children: <span> — supplementary copy</span>}};
