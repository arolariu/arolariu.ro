import type {Meta, StoryObj} from "storybook-react-rsbuild";
import {Separator} from "./separator";

const meta = {
  title: "Components/Layout/Separator",
  component: Separator,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Horizontal separator dividing content sections.
 */
export const Horizontal: Story = {
  render: () => (
    <div className="w-64 space-y-4">
      <div>
        <h4 className="text-sm font-medium">Section One</h4>
        <p className="text-sm text-muted-foreground">Content for the first section.</p>
      </div>
      <Separator orientation="horizontal" />
      <div>
        <h4 className="text-sm font-medium">Section Two</h4>
        <p className="text-sm text-muted-foreground">Content for the second section.</p>
      </div>
    </div>
  ),
};

/**
 * Vertical separator between inline elements.
 */
export const Vertical: Story = {
  render: () => (
    <div className="flex h-16 items-center space-x-4">
      <div className="text-sm">
        <p className="font-medium">Item 1</p>
      </div>
      <Separator
        orientation="vertical"
        className="h-full"
      />
      <div className="text-sm">
        <p className="font-medium">Item 2</p>
      </div>
      <Separator
        orientation="vertical"
        className="h-full"
      />
      <div className="text-sm">
        <p className="font-medium">Item 3</p>
      </div>
    </div>
  ),
};

/**
 * Separator in a navigation menu.
 */
export const InNavigation: Story = {
  render: () => (
    <div className="w-64">
      <div className="space-y-1">
        <button className="w-full px-3 py-2 text-left text-sm hover:bg-accent rounded-md">Home</button>
        <button className="w-full px-3 py-2 text-left text-sm hover:bg-accent rounded-md">Dashboard</button>
        <button className="w-full px-3 py-2 text-left text-sm hover:bg-accent rounded-md">Projects</button>
      </div>
      <Separator className="my-2" />
      <div className="space-y-1">
        <button className="w-full px-3 py-2 text-left text-sm hover:bg-accent rounded-md">Settings</button>
        <button className="w-full px-3 py-2 text-left text-sm hover:bg-accent rounded-md">Help</button>
      </div>
    </div>
  ),
};
