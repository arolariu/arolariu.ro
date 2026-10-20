import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Spinner} from "./spinner";
const storyStyles = `
.ac-story-spinner-storyMedium {
  width: 2rem;
  height: 2rem;
}

.ac-story-spinner-storyLarge {
  width: 4rem;
  height: 4rem;
}

.ac-story-spinner-storyLabel {
  display: flex;
  align-items: center;
  gap: var(--ac-space-3);
}
`;

const storyClasses = {
  storyMedium: "ac-story-spinner-storyMedium",
  storyLarge: "ac-story-spinner-storyLarge",
  storyLabel: "ac-story-spinner-storyLabel",
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
  title: "Components/Feedback/Spinner",
  component: Spinner,
  tags: ["autodocs"],
  argTypes: {animated: {control: "boolean"}},
} satisfies Meta<typeof Spinner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {args: {"aria-label": "Loading content"}};
export const Small: Story = Default;
export const Medium: Story = {args: {className: storyClasses.storyMedium, "aria-label": "Loading content"}};
export const Large: Story = {args: {className: storyClasses.storyLarge, "aria-label": "Loading content"}};
export const Static: Story = {args: {animated: false, "aria-label": "Preparing the preview"}};

export const InButton: Story = {
  render: (args): React.JSX.Element => (
    <Button
      disabled
      aria-busy='true'>
      <Spinner
        {...args}
        aria-hidden='true'
      />
      <span>Processing…</span>
    </Button>
  ),
};
export const WithLabel: Story = {
  render: (args): React.JSX.Element => (
    <div className={storyClasses.storyLabel}>
      <Spinner
        {...args}
        aria-label='Loading content'
      />
      <span>Loading your content…</span>
    </div>
  ),
};
export const ReducedMotion: Story = {
  ...Default,
  parameters: {
    docs: {
      description: {
        story:
          "Enable prefers-reduced-motion in your system or developer tools. Rotation stops while the visible indicator and named status remain.",
      },
    },
  },
};
