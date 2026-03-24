import {AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline} from "lucide-react";
import * as React from "react";
import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Toolbar, ToolbarButton, ToolbarGroup, ToolbarLink, ToolbarSeparator} from "./toolbar";

const meta = {
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
          <AlignLeft className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton aria-label='Align center'>
          <AlignCenter className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton aria-label='Align right'>
          <AlignRight className='h-4 w-4' />
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
      <div style={{position: "relative"}}>
        <ToolbarButton
          onClick={() => setShowDropdown(!showDropdown)}
          aria-label='More options'>
          More ▾
        </ToolbarButton>
        {showDropdown ? (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              minWidth: "120px",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              padding: "0.25rem",
              zIndex: 10,
            }}>
            <button
              type='button'
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "0.875rem",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => setShowDropdown(false)}>
              Clear formatting
            </button>
            <button
              type='button'
              style={{
                width: "100%",
                padding: "0.5rem",
                fontSize: "0.875rem",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
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
    <div style={{width: "100%", maxWidth: "600px"}}>
      <Toolbar
        aria-label='Text formatting'
        style={{
          padding: "0.5rem",
          background: "#f9fafb",
          borderRadius: "8px 8px 0 0",
          borderBottom: "1px solid #e5e7eb",
        }}>
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
            <AlignLeft className='h-4 w-4' />
          </ToolbarButton>
          <ToolbarButton aria-label='Align center'>
            <AlignCenter className='h-4 w-4' />
          </ToolbarButton>
          <ToolbarButton aria-label='Align right'>
            <AlignRight className='h-4 w-4' />
          </ToolbarButton>
        </ToolbarGroup>
      </Toolbar>
      <div
        style={{
          minHeight: "200px",
          padding: "1rem",
          background: "white",
          border: "1px solid #e5e7eb",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
        }}
        contentEditable
        suppressContentEditableWarning>
        Start typing...
      </div>
    </div>
  ),
};
