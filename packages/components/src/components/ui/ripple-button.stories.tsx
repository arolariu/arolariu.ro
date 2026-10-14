import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {RippleButton} from "./ripple-button";
const storyStyles = `
.ac-story-ripple-button-storyRow {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ac-space-3);
}

.ac-story-ripple-button-storyMuted {
  background: var(--ac-secondary);
  color: var(--ac-secondary-foreground);
}
`;

const storyClasses = {
  storyRow: "ac-story-ripple-button-storyRow",
  storyMuted: "ac-story-ripple-button-storyMuted",
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
    <div className={storyClasses.storyRow}>
      <RippleButton>Primary</RippleButton>
      <RippleButton className={storyClasses.storyMuted}>Secondary</RippleButton>
    </div>
  ),
};
