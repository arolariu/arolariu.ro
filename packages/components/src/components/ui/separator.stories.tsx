"use client";

import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Button} from "./button";
import {Separator} from "./separator";
const storyStyles = `
.ac-story-separator-storyStack {
  display: flex;
  width: 20rem;
  flex-direction: column;
  gap: var(--ac-space-4);
}

.ac-story-separator-storyRow {
  display: flex;
  width: 20rem;
  height: 4rem;
  align-items: center;
  gap: var(--ac-space-4);
}

.ac-story-separator-storyHorizontal {
  flex: 1;
}

.ac-story-separator-storyVertical {
  align-self: stretch;
}
`;

const storyClasses = {
  storyStack: "ac-story-separator-storyStack",
  storyRow: "ac-story-separator-storyRow",
  storyHorizontal: "ac-story-separator-storyHorizontal",
  storyVertical: "ac-story-separator-storyVertical",
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
  title: "Components/Layout/Separator",
  component: Separator,
  tags: ["autodocs"],
  parameters: {layout: "centered"},
} satisfies Meta<typeof Separator>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyStack}>
      <p>Section one</p>
      <Separator />
      <p>Section two</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyRow}>
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
      className={storyClasses.storyStack}>
      <a href='#home'>Home</a>
      <a href='#projects'>Projects</a>
      <Separator />
      <a href='#help'>Help</a>
    </nav>
  ),
};

export const WithLabel: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyRow}>
      <Separator />
      <span>OR</span>
      <Separator />
    </div>
  ),
};

export const Decorative: Story = {
  render: (): React.JSX.Element => (
    <div className={storyClasses.storyStack}>
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
    <div className={storyClasses.storyStack}>
      <Button onClick={() => setOrientation(orientation === "horizontal" ? "vertical" : "horizontal")}>Toggle orientation</Button>
      <div className={storyClasses.storyRow}>
        <span>Before</span>
        <Separator
          orientation={orientation}
          className={(state) => (state.orientation === "vertical" ? storyClasses.storyVertical : storyClasses.storyHorizontal)}
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
