import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Kbd, KbdGroup} from "./kbd";

const meta = {title: "Components/Data Display/Kbd", component: Kbd, tags: ["autodocs"]} satisfies Meta<typeof Kbd>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SingleKey: Story = {
  render: (): React.JSX.Element => (
    <p>
      Press <Kbd>Enter</Kbd> to submit.
    </p>
  ),
};
export const KeyboardShortcut: Story = {
  render: (): React.JSX.Element => (
    <p>
      Save:{" "}
      <KbdGroup aria-label='Command S'>
        <Kbd>⌘</Kbd>
        <Kbd>S</Kbd>
      </KbdGroup>
    </p>
  ),
};
export const ShortcutsList: Story = {
  render: (): React.JSX.Element => (
    <dl>
      <dt>Search</dt>
      <dd>
        <KbdGroup aria-label='Control K'>
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </dd>
      <dt>New file</dt>
      <dd>
        <KbdGroup aria-label='Control N'>
          <Kbd>Ctrl</Kbd>
          <Kbd>N</Kbd>
        </KbdGroup>
      </dd>
      <dt>Undo</dt>
      <dd>
        <KbdGroup aria-label='Control Z'>
          <Kbd>Ctrl</Kbd>
          <Kbd>Z</Kbd>
        </KbdGroup>
      </dd>
    </dl>
  ),
};
export const Combination: Story = {
  render: (): React.JSX.Element => (
    <p>
      Command palette:{" "}
      <KbdGroup aria-label='Control Shift P'>
        <Kbd>Ctrl</Kbd>
        <Kbd>Shift</Kbd>
        <Kbd>P</Kbd>
      </KbdGroup>
    </p>
  ),
};
export const MacStyle: Story = KeyboardShortcut;
export const InContext: Story = {
  render: (): React.JSX.Element => (
    <p>
      Save with{" "}
      <KbdGroup aria-label='Control S'>
        <Kbd>Ctrl</Kbd>
        <Kbd>S</Kbd>
      </KbdGroup>
      . Press <Kbd>Esc</Kbd> to cancel.
    </p>
  ),
};
