import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Skeleton} from "./skeleton";
import styles from "./skeleton.module.css";

const meta = {
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
      className={styles.storyStack}
      aria-busy='true'
      aria-label='Loading content'>
      <Skeleton
        {...args}
        className={styles.storyLine}
      />
      <Skeleton
        {...args}
        className={styles.storyShortLine}
      />
      <span role='status'>Preparing content…</span>
    </div>
  ),
};
export const Static: Story = {...Default, args: {animated: false}};
export const Card: Story = {
  render: (args): React.JSX.Element => (
    <div className={styles.storyStack}>
      <Skeleton
        {...args}
        className={styles.storyAvatar}
      />
      <Skeleton
        {...args}
        className={styles.storyLine}
      />
      <Skeleton
        {...args}
        className={styles.storyShortLine}
      />
    </div>
  ),
};
export const List: Story = {
  render: (args): React.JSX.Element => (
    <div className={styles.storyStack}>
      {[1, 2, 3].map((id) => (
        <div
          key={id}
          className={styles.storyRow}>
          <Skeleton
            {...args}
            className={styles.storyAvatar}
          />
          <Skeleton
            {...args}
            className={styles.storyLine}
          />
        </div>
      ))}
    </div>
  ),
};
export const Paragraph: Story = {
  render: (args): React.JSX.Element => (
    <div className={styles.storyStack}>
      {[1, 2, 3, 4].map((id) => (
        <Skeleton
          key={id}
          {...args}
          className={styles.storyLine}
        />
      ))}
      <Skeleton
        {...args}
        className={styles.storyShortLine}
      />
    </div>
  ),
};
export const Profile: Story = Card;
export const Dashboard: Story = {
  render: (args): React.JSX.Element => (
    <div className={styles.storyStack}>
      <Skeleton
        {...args}
        className={styles.storyLine}
      />
      <Skeleton
        {...args}
        className={styles.storyPanel}
      />
      <Skeleton
        {...args}
        className={styles.storyShortLine}
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
