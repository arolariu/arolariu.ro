import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Skeleton} from "./skeleton";
const storyStyles = `
.ac-story-skeleton-storyStack {
  display: flex;
  width: 20rem;
  max-width: 100%;
  flex-direction: column;
  gap: var(--ac-space-3);
}

.ac-story-skeleton-storyRow {
  display: flex;
  align-items: center;
  gap: var(--ac-space-3);
}

.ac-story-skeleton-storyLine {
  width: 100%;
  height: 1rem;
}

.ac-story-skeleton-storyShortLine {
  width: 70%;
  height: 1rem;
}

.ac-story-skeleton-storyAvatar {
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  border-radius: 50%;
}

.ac-story-skeleton-storyPanel {
  width: 100%;
  height: 10rem;
}
`;

const storyClasses = {
  storyStack: "ac-story-skeleton-storyStack",
  storyRow: "ac-story-skeleton-storyRow",
  storyLine: "ac-story-skeleton-storyLine",
  storyShortLine: "ac-story-skeleton-storyShortLine",
  storyAvatar: "ac-story-skeleton-storyAvatar",
  storyPanel: "ac-story-skeleton-storyPanel",
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
  title: "Components/Feedback/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  argTypes: {animated: {control: "boolean"}},
} satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args): React.JSX.Element => (
    <div
      className={storyClasses.storyStack}
      aria-busy='true'
      aria-label='Loading content'>
      <Skeleton
        {...args}
        className={storyClasses.storyLine}
      />
      <Skeleton
        {...args}
        className={storyClasses.storyShortLine}
      />
      <span role='status'>Preparing content…</span>
    </div>
  ),
};
export const Static: Story = {...Default, args: {animated: false}};
export const Card: Story = {
  render: (args): React.JSX.Element => (
    <div className={storyClasses.storyStack}>
      <Skeleton
        {...args}
        className={storyClasses.storyAvatar}
      />
      <Skeleton
        {...args}
        className={storyClasses.storyLine}
      />
      <Skeleton
        {...args}
        className={storyClasses.storyShortLine}
      />
    </div>
  ),
};
export const List: Story = {
  render: (args): React.JSX.Element => (
    <div className={storyClasses.storyStack}>
      {[1, 2, 3].map((id) => (
        <div
          key={id}
          className={storyClasses.storyRow}>
          <Skeleton
            {...args}
            className={storyClasses.storyAvatar}
          />
          <Skeleton
            {...args}
            className={storyClasses.storyLine}
          />
        </div>
      ))}
    </div>
  ),
};
export const Paragraph: Story = {
  render: (args): React.JSX.Element => (
    <div className={storyClasses.storyStack}>
      {[1, 2, 3, 4].map((id) => (
        <Skeleton
          key={id}
          {...args}
          className={storyClasses.storyLine}
        />
      ))}
      <Skeleton
        {...args}
        className={storyClasses.storyShortLine}
      />
    </div>
  ),
};
export const Profile: Story = Card;
export const Dashboard: Story = {
  render: (args): React.JSX.Element => (
    <div className={storyClasses.storyStack}>
      <Skeleton
        {...args}
        className={storyClasses.storyLine}
      />
      <Skeleton
        {...args}
        className={storyClasses.storyPanel}
      />
      <Skeleton
        {...args}
        className={storyClasses.storyShortLine}
      />
    </div>
  ),
};
export const ReducedMotion: Story = {
  ...Default,
  parameters: {
    docs: {
      description: {
        story:
          "Enable prefers-reduced-motion in your system or developer tools. Pulse stops, but the visible placeholder and named status remain.",
      },
    },
  },
};
