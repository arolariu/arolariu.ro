import {type JSX, useState} from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Textarea} from "./textarea";
import {Label} from "./label";
const storyStyles = `
.ac-story-textarea-storyStack {
  display: grid;
  width: min(100%, 28rem);
  gap: var(--ac-space-3);
}

.ac-story-textarea-storyCount {
  margin: 0;
  color: var(--ac-muted-foreground);
  font-size: var(--ac-text-sm);
  text-align: end;
}
`;

const storyClasses = {
  storyStack: "ac-story-textarea-storyStack",
  storyCount: "ac-story-textarea-storyCount",
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
    "aria-label": "Message",
  },
};

/**
 * Textarea with default value.
 */
export const WithValue: Story = {
  args: {
    defaultValue: "This is a pre-filled message that can be edited.",
    rows: 5,
    "aria-label": "Editable message",
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
    "aria-label": "Disabled message",
  },
};

/**
 * Textarea with character count display.
 */
function WithCharCountDemo(): JSX.Element {
  const [text, setText] = useState("");
  const maxChars = 200;

  return (
    <div className={storyClasses.storyStack}>
      <Label htmlFor='bio'>Biography</Label>
      <Textarea
        id='bio'
        aria-describedby='bio-count'
        placeholder='Enter your bio (max 200 characters)...'
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={maxChars}
        rows={5}
      />
      <output
        id='bio-count'
        className={storyClasses.storyCount}>
        {text.length} / {maxChars}
      </output>
    </div>
  );
}

export const WithCharCount: Story = {
  render: () => <WithCharCountDemo />,
};

/**
 * Native manual resizing with different initial row sizes (not JavaScript autosizing).
 */
export const AutoResize: Story = {
  render: () => (
    <div className={storyClasses.storyStack}>
      <div>
        <Label htmlFor='small-notes'>Small (2 rows)</Label>
        <Textarea
          id='small-notes'
          placeholder='Compact textarea'
          rows={2}
        />
      </div>
      <div>
        <Label htmlFor='medium-notes'>Medium (5 rows)</Label>
        <Textarea
          id='medium-notes'
          placeholder='Standard textarea'
          rows={5}
        />
      </div>
      <div>
        <Label htmlFor='large-notes'>Large (10 rows)</Label>
        <Textarea
          id='large-notes'
          placeholder='Expanded textarea'
          rows={10}
        />
      </div>
    </div>
  ),
};

/** Opt-in CSS content sizing, with native manual resizing as the browser fallback. */
export const ContentSized: Story = {
  args: {"aria-label": "Content-sized notes", "data-sizing": "content", placeholder: "Type multiple lines to grow in supporting browsers."},
};

export const Invalid: Story = {
  args: {"aria-label": "Invalid notes", "aria-invalid": true, defaultValue: "Needs more detail"},
};
