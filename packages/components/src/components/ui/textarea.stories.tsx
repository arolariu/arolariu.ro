import {useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Textarea} from "./textarea";

const meta = {
  title: "Components/Forms/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default textarea with placeholder.
 */
export const Default: Story = {
  args: {
    placeholder: "Enter your message here...",
    rows: 4,
  },
};

/**
 * Textarea with default value.
 */
export const WithValue: Story = {
  args: {
    defaultValue: "This is a pre-filled message that can be edited.",
    rows: 5,
  },
};

/**
 * Disabled textarea.
 */
export const Disabled: Story = {
  args: {
    placeholder: "This textarea is disabled",
    disabled: true,
    rows: 4,
  },
};

/**
 * Textarea with character count display.
 */
function WithCharCountDemo() {
  const [text, setText] = useState("");
  const maxChars = 200;

  return (
    <div style={{width: "400px"}}>
      <Textarea
        placeholder='Enter your bio (max 200 characters)...'
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={maxChars}
        rows={5}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          fontSize: "0.875rem",
          marginTop: "0.5rem",
          color: text.length >= maxChars ? "red" : "gray",
        }}>
        {text.length} / {maxChars}
      </div>
    </div>
  );
}

export const WithCharCount: Story = {
  render: () => <WithCharCountDemo />,
};

/**
 * Textarea with different row sizes.
 */
export const AutoResize: Story = {
  render: () => (
    <div style={{display: "flex", flexDirection: "column", gap: "1rem", width: "400px"}}>
      <div>
        <label style={{display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500}}>Small (2 rows)</label>
        <Textarea
          placeholder='Compact textarea'
          rows={2}
        />
      </div>
      <div>
        <label style={{display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500}}>Medium (5 rows)</label>
        <Textarea
          placeholder='Standard textarea'
          rows={5}
        />
      </div>
      <div>
        <label style={{display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 500}}>Large (10 rows)</label>
        <Textarea
          placeholder='Expanded textarea'
          rows={10}
        />
      </div>
    </div>
  ),
};
