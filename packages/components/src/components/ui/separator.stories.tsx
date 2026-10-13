"use client";

import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Separator} from "./separator";
import styles from "./separator.module.css";

const meta = {
  title: "Components/Layout/Separator",
  component: Separator,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (): React.JSX.Element => (
    <div className={styles.storyStack}>
      <p>Section one</p>
      <Separator />
      <p>Section two</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: (): React.JSX.Element => (
    <div className={styles.storyRow}>
      <span>Item one</span>
      <Separator orientation='vertical' />
      <span>Item two</span>
    </div>
  ),
};

export const InNavigation: Story = {
  render: (): React.JSX.Element => (
    <nav
      aria-label='Example navigation'
      className={styles.storyStack}>
      <a href='#home'>Home</a>
      <a href='#projects'>Projects</a>
      <Separator />
      <a href='#help'>Help</a>
    </nav>
  ),
};

export const WithLabel: Story = {
  render: (): React.JSX.Element => (
    <div className={styles.storyRow}>
      <Separator />
      <span>OR</span>
      <Separator />
    </div>
  ),
};

export const Decorative: Story = {
  render: (): React.JSX.Element => (
    <div className={styles.storyStack}>
      <p>Introduction</p>
      <Separator
        decorative
        aria-hidden='true'
        role='presentation'
      />
      <p>Details</p>
    </div>
  ),
};

function StatefulSeparator(): React.JSX.Element {
  const [orientation, setOrientation] = React.useState<"horizontal" | "vertical">("horizontal");
  return (
    <div className={styles.storyStack}>
      <Button onClick={() => setOrientation(orientation === "horizontal" ? "vertical" : "horizontal")}>Toggle orientation</Button>
      <div className={styles.storyRow}>
        <span>Before</span>
        <Separator
          orientation={orientation}
          className={(state) => (state.orientation === "vertical" ? styles.storyVertical : styles.storyHorizontal)}
          render={(props, state) => (
            <div
              {...props}
              aria-label={`${state.orientation} rule`}
            />
          )}
        />
        <span>After</span>
      </div>
    </div>
  );
}
export const StateCallbacks: Story = {render: (): React.JSX.Element => <StatefulSeparator />};
