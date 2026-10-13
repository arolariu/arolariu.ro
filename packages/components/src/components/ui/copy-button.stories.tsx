import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {CopyButton} from "./copy-button";
import styles from "./copy-button.module.css";

const meta = {
  title: "Components/Actions/CopyButton",
  component: CopyButton,
  tags: ["autodocs"],
  args: {value: "npm install @arolariu/components"},
  argTypes: {
    value: {control: "text"},
    timeout: {control: "number"},
    onCopyError: {description: "Receives native clipboard failures; suppressed after unmount."},
  },
} satisfies Meta<typeof CopyButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ShortTimeout: Story = {args: {timeout: 1000}};
export const LongText: Story = {args: {value: "A longer text value copied through the native Clipboard API."}};
export const Disabled: Story = {args: {disabled: true}};

function CopyButtonFeedback(): React.JSX.Element {
  const [message, setMessage] = React.useState("Activate the button to copy the command.");
  return (
    <div className={styles.storyPanel}>
      <code>npm install @arolariu/components</code>
      <CopyButton
        value='npm install @arolariu/components'
        aria-label='Copy install command'
        onCopyError={() => setMessage("Clipboard access failed. Check browser permissions.")}
      />
      <p role='status'>{message}</p>
    </div>
  );
}

/** Uses the actual component and reports clipboard permission failures. */
export const WithText: Story = {render: () => <CopyButtonFeedback />};
export const LongValue: Story = {
  render: () => (
    <div className={styles.storyRow}>
      <code>https://github.com/arolariu/arolariu.ro</code>
      <CopyButton
        value='https://github.com/arolariu/arolariu.ro'
        aria-label='Copy repository URL'
      />
    </div>
  ),
};
export const InCodeBlock: Story = {
  render: () => (
    <div className={styles.storyPanel}>
      <pre>
        <code>npm install @arolariu/components</code>
      </pre>
      <CopyButton value='npm install @arolariu/components' />
    </div>
  ),
};
