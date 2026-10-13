import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {RippleButton} from "./ripple-button";
import styles from "./ripple-button.module.css";

const meta = {
  title: "Components/Actions/RippleButton",
  component: RippleButton,
  tags: ["autodocs"],
  args: {children: "Activate"},
  argTypes: {scale: {control: "number"}},
} satisfies Meta<typeof RippleButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const LargeRipple: Story = {args: {scale: 20}};
/** Lifetime is owned by real Motion completion, not a fixed 600ms timer. */
export const OneSecond: Story = {args: {transition: {duration: 1, ease: "linear"}}};
export const Disabled: Story = {args: {disabled: true}};
export const Canceled: Story = {args: {children: "Canceled activation", onClick: (event) => event.preventDefault()}};
export const Variants: Story = {
  render: () => (
    <div className={styles.storyRow}>
      <RippleButton>Primary</RippleButton>
      <RippleButton className={styles.storyMuted}>Secondary</RippleButton>
    </div>
  ),
};
