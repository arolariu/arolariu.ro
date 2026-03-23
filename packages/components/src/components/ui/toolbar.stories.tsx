import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight} from "lucide-react";
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
    <Toolbar aria-label="Text formatting">
      <ToolbarButton aria-label="Bold">
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton aria-label="Italic">
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton aria-label="Underline">
        <Underline className="h-4 w-4" />
      </ToolbarButton>
    </Toolbar>
  ),
};

/**
 * Toolbar with grouped controls and separators.
 */
export const WithGroups: Story = {
  render: () => (
    <Toolbar aria-label="Text editing">
      <ToolbarGroup>
        <ToolbarButton aria-label="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton aria-label="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton aria-label="Underline">
          <Underline className="h-4 w-4" />
        </ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ToolbarButton aria-label="Align left">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton aria-label="Align center">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton aria-label="Align right">
          <AlignRight className="h-4 w-4" />
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
    <Toolbar aria-label="Document actions">
      <ToolbarGroup>
        <ToolbarButton>Save</ToolbarButton>
        <ToolbarButton>Export</ToolbarButton>
      </ToolbarGroup>
      <ToolbarSeparator />
      <ToolbarGroup>
        <ToolbarLink href="#docs">Documentation</ToolbarLink>
        <ToolbarLink href="#help">Help</ToolbarLink>
      </ToolbarGroup>
    </Toolbar>
  ),
};
