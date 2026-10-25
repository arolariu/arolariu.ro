import {Bold, Italic, TextAlignCenter, TextAlignEnd, TextAlignStart, Underline} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Popover, PopoverContent, PopoverTrigger} from "./popover";
import {Toolbar, ToolbarButton, ToolbarGroup, ToolbarLink, ToolbarSeparator} from "./toolbar";
const storyStyles = `
.ac-story-toolbar-dropdownMenu {
  min-width: 120px;
  background: var(--ac-popover);
  color: var(--ac-popover-foreground);
  border: 1px solid var(--ac-border);
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 0.25rem;
  z-index: 10;
}

.ac-story-toolbar-dropdownOption {
  width: 100%;
  min-height: 24px;
  padding: 0.5rem;
  font-size: 0.875rem;
  text-align: start;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.ac-story-toolbar-dropdownOption:focus-visible {
  outline: 2px solid var(--ac-ring);
  outline-offset: -2px;
}

.ac-story-toolbar-editor {
  width: 100%;
  max-width: 600px;
}

.ac-story-toolbar-editorToolbar {
  padding: 0.5rem;
  background: var(--ac-muted);
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid var(--ac-border);
}

.ac-story-toolbar-editorContent {
  min-height: 200px;
  padding: 1rem;
  background: var(--ac-background);
  color: var(--ac-foreground);
  border: 1px solid var(--ac-input);
  border-top: none;
  border-radius: 0 0 8px 8px;
}
`;

const storyClasses = {
  dropdownMenu: "ac-story-toolbar-dropdownMenu",
  dropdownOption: "ac-story-toolbar-dropdownOption",
  editor: "ac-story-toolbar-editor",
  editorToolbar: "ac-story-toolbar-editorToolbar",
  editorContent: "ac-story-toolbar-editorContent",
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
  title: "Components/Navigation/Toolbar",
  component: Toolbar,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Toolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Text formatting toolbar with buttons.
 */
export const Default: Story = {
  render: () => (
    <Toolbar aria-label='Text formatting'>
      <ToolbarButton aria-label='Bold'>
        <Bold className='h-4 w-4' />
      </ToolbarButton>
      <ToolbarButton aria-label='Italic'>
        <Italic className='h-4 w-4' />
      </ToolbarButton>
      <ToolbarButton aria-label='Underline'>
        <Underline className='h-4 w-4' />
      </ToolbarButton>
    </Toolbar>
  ),
};

/**
 * Toolbar with grouped controls and separators.
 */
export const WithGroups: Story = {
  render: () => (
    <Toolbar aria-label='Text editing'>
      <ToolbarGroup>
        <ToolbarButton aria-label='Bold'>
          <Bold className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton aria-label='Italic'>
          <Italic className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton aria-label='Underline'>
          <Underline className='h-4 w-4' />
        </ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ToolbarButton aria-label='Align left'>
          <TextAlignStart className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton aria-label='Align center'>
          <TextAlignCenter className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton aria-label='Align right'>
          <TextAlignEnd className='h-4 w-4' />
        </ToolbarButton>
      </ToolbarGroup>
    </Toolbar>
  ),
};

/**
 * Toolbar with buttons and links.
 */
export const WithLinks: Story = {
  render: () => (
    <Toolbar aria-label='Document actions'>
      <ToolbarGroup>
        <ToolbarButton>Save</ToolbarButton>
        <ToolbarButton>Export</ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ToolbarLink href='#docs'>Documentation</ToolbarLink>
        <ToolbarLink href='#help'>Help</ToolbarLink>
      </ToolbarGroup>
    </Toolbar>
  ),
};

function ToolbarWithDropdownContent(): React.JSX.Element {
  const [showDropdown, setShowDropdown] = React.useState(false);

  return (
    <Toolbar aria-label='Document editor'>
      <ToolbarGroup>
        <ToolbarButton aria-label='Bold'>
          <Bold className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton aria-label='Italic'>
          <Italic className='h-4 w-4' />
        </ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <Popover
        open={showDropdown}
        onOpenChange={setShowDropdown}>
        <PopoverTrigger render={<ToolbarButton aria-label='More options' />}>
          More <span aria-hidden='true'>▾</span>
        </PopoverTrigger>
        <PopoverContent
          className={storyClasses.dropdownMenu}
          aria-label='More editor actions'
          align='start'>
          <button
            type='button'
            className={storyClasses.dropdownOption}
            onClick={() => setShowDropdown(false)}>
            Clear formatting
          </button>
          <button
            type='button'
            className={storyClasses.dropdownOption}
            onClick={() => setShowDropdown(false)}>
            Insert link
          </button>
        </PopoverContent>
      </Popover>
    </Toolbar>
  );
}

/**
 * Toolbar with a dropdown menu button.
 */
export const WithDropdown: Story = {
  render: () => <ToolbarWithDropdownContent />,
};

/**
 * Rich text editor style toolbar with bold, italic, and underline controls.
 */
export const EditorToolbar: Story = {
  render: () => (
    <div className={storyClasses.editor}>
      <Toolbar
        aria-label='Text formatting'
        className={storyClasses.editorToolbar}>
        <ToolbarGroup>
          <ToolbarButton aria-label='Bold'>
            <Bold className='h-4 w-4' />
          </ToolbarButton>
          <ToolbarButton aria-label='Italic'>
            <Italic className='h-4 w-4' />
          </ToolbarButton>
          <ToolbarButton aria-label='Underline'>
            <Underline className='h-4 w-4' />
          </ToolbarButton>
        </ToolbarGroup>
        <ToolbarSeparator />
        <ToolbarGroup>
          <ToolbarButton aria-label='Align left'>
            <TextAlignStart className='h-4 w-4' />
          </ToolbarButton>
          <ToolbarButton aria-label='Align center'>
            <TextAlignCenter className='h-4 w-4' />
          </ToolbarButton>
          <ToolbarButton aria-label='Align right'>
            <TextAlignEnd className='h-4 w-4' />
          </ToolbarButton>
        </ToolbarGroup>
      </Toolbar>
      <div
        className={storyClasses.editorContent}
        role='textbox'
        aria-label='Document content'
        aria-multiline='true'
        contentEditable
        suppressContentEditableWarning>
        Start typing...
      </div>
    </div>
  ),
};
