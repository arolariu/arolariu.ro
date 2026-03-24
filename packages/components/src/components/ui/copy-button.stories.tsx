import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {CopyButton} from "./copy-button";

const meta = {
  title: "Components/Actions/CopyButton",
  component: CopyButton,
  tags: ["autodocs"],
  parameters: {
    componentSubtitle: "🆕 New in v1.0",
  },
  argTypes: {
    value: {
      control: "text",
      description: "Text to copy to clipboard",
    },
    timeout: {
      control: "number",
      description: "Duration (ms) to show success state",
    },
  },
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "npm install @arolariu/components",
  },
};

export const ShortTimeout: Story = {
  args: {
    value: "Copy me!",
    timeout: 1000,
  },
};

export const LongText: Story = {
  args: {
    value: "This is a very long text that will be copied to the clipboard when you click the button.",
  },
};

function CopyButtonWithTextContent(): React.JSX.Element {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      type='button'
      onClick={() => {
        navigator.clipboard.writeText("Hello, world!");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      style={{
        padding: "0.5rem 1rem",
        fontSize: "0.875rem",
        fontWeight: "500",
        background: copied ? "#22c55e" : "#3b82f6",
        color: "white",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "background-color 0.2s",
        minWidth: "100px",
      }}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

/**
 * Copy button with text label that changes to "Copied!" on success.
 */
export const WithText: Story = {
  render: () => <CopyButtonWithTextContent />,
};

/**
 * Copy button for a long URL or code snippet.
 */
export const LongValue: Story = {
  render: () => (
    <div style={{maxWidth: "32rem", display: "flex", flexDirection: "column", gap: "0.5rem"}}>
      <p style={{fontSize: "0.875rem", fontWeight: "500"}}>Repository URL:</p>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.75rem",
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
        }}>
        <code
          style={{
            flex: 1,
            fontSize: "0.875rem",
            color: "#374151",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
          https://github.com/arolariu/arolariu.ro/tree/main/packages/components
        </code>
        <CopyButton value='https://github.com/arolariu/arolariu.ro/tree/main/packages/components' />
      </div>
    </div>
  ),
};

/**
 * Copy button positioned in a code snippet corner.
 */
export const InCodeBlock: Story = {
  render: () => (
    <div
      style={{
        position: "relative",
        maxWidth: "32rem",
        padding: "1rem",
        background: "#1f2937",
        color: "#f9fafb",
        borderRadius: "8px",
        fontFamily: "monospace",
        fontSize: "0.875rem",
      }}>
      <div style={{position: "absolute", top: "0.5rem", right: "0.5rem"}}>
        <CopyButton value='npm install @arolariu/components' />
      </div>
      <pre style={{margin: 0, padding: 0}}>
        <code>npm install @arolariu/components</code>
      </pre>
    </div>
  ),
};
