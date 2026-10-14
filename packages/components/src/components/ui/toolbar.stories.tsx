import {Bold, Italic, TextAlignCenter, TextAlignEnd, TextAlignStart, Underline} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Toolbar, ToolbarButton, ToolbarGroup, ToolbarLink, ToolbarSeparator} from "./toolbar";
const storyStyles = `
.ac-story-toolbar-dropdownPositioner {
  position: relative;
}

.ac-story-toolbar-dropdownMenu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  min-width: 120px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  padding: 0.25rem;
  z-index: 10;
}

.ac-story-toolbar-dropdownOption {
  width: 100%;
  padding: 0.5rem;
  font-size: 0.875rem;
  text-align: left;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.ac-story-toolbar-editor {
  width: 100%;
  max-width: 600px;
}

.ac-story-toolbar-editorToolbar {
  padding: 0.5rem;
  background: #f9fafb;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e5e7eb;
}

.ac-story-toolbar-editorContent {
  min-height: 200px;
  padding: 1rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 8px 8px;
}
`;

const storyClasses = {
  dropdownPositioner: "ac-story-toolbar-dropdownPositioner",
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
      <div className={storyClasses.dropdownPositioner}>
        <ToolbarButton
          onClick={() => setShowDropdown(!showDropdown)}
          aria-label='More options'>
          More ▾
        </ToolbarButton>
        {showDropdown ? (
          <div className={storyClasses.dropdownMenu}>
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
          </div>
        ) : null}
      </div>
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
        contentEditable
        suppressContentEditableWarning>
        Start typing...
      </div>
    </div>
  ),
};
