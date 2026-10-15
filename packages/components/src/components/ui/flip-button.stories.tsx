import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {cn} from "@/lib/utilities";
import {FlipButton} from "./flip-button";
const storyStyles = `
.ac-story-flip-button-storyLarge {
  height: 3rem;
  padding-inline: var(--ac-space-6);
  font-size: var(--ac-text-lg);
}

.ac-story-flip-button-storyFront {
  background: var(--ac-accent);
  color: var(--ac-accent-foreground);
}
`;

const storyClasses = {
  storyLarge: "ac-story-flip-button-storyLarge",
  storyFront: "ac-story-flip-button-storyFront",
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
  title: "Components/Actions/FlipButton",
  component: FlipButton,
  tags: ["autodocs"],
  args: {frontText: "Show details", backText: "Open details", from: "top"},
  argTypes: {from: {control: "select", options: ["top", "bottom", "left", "right"]}},
} satisfies Meta<typeof FlipButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const FlipFromBottom: Story = {args: {from: "bottom"}};
export const FlipFromLeft: Story = {args: {from: "left"}};
/** Flips from the right using the supported direction spelling. */
export const FlipFromRight: Story = {args: {from: "right"}};
export const CustomStyling: Story = {args: {className: cn(storyClasses.storyLarge), frontClassName: cn(storyClasses.storyFront)}};
export const Disabled: Story = {args: {disabled: true}};
export const CallerLabel: Story = {
  args: {"aria-label": "Open documentation in a new tab", frontText: "Open documentation", backText: "Open documentation"},
};
