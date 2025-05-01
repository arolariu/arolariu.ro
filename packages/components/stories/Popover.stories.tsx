import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  Button,
  Input,
  Label,
} from "../dist";
import { Settings, PlusCircle, Check, ChevronsUpDown } from "lucide-react";

const meta: Meta<typeof Popover> = {
  title: "Design System/Popover",
  component: Popover,
  parameters: {
    layout: "centered",
  },
};

export default meta;

type Story = StoryObj<typeof Popover>;

// Basic popover
export const Basic: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open Popover</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Dimensions</h4>
            <p className="text-sm text-muted-foreground">
              Set the dimensions for the layer.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="width">Width</Label>
              <Input
                id="width"
                defaultValue="100%"
                className="col-span-2 h-8"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="maxWidth">Max. width</Label>
              <Input
                id="maxWidth"
                defaultValue="300px"
                className="col-span-2 h-8"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                defaultValue="25px"
                className="col-span-2 h-8"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="maxHeight">Max. height</Label>
              <Input
                id="maxHeight"
                defaultValue="none"
                className="col-span-2 h-8"
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

// Popover with settings
export const WithSettings: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-10 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Appearance</h4>
            <p className="text-sm text-muted-foreground">
              Customize the appearance of the app.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="theme">Theme</Label>
              <select
                id="theme"
                className="h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                defaultValue="system"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="font">Font</Label>
              <select
                id="font"
                className="h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                defaultValue="inter"
              >
                <option value="inter">Inter</option>
                <option value="manrope">Manrope</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-sidebar"
                className="h-4 w-4"
                defaultChecked
              />
              <Label htmlFor="show-sidebar">Show sidebar</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="show-toolbar"
                className="h-4 w-4"
                defaultChecked
              />
              <Label htmlFor="show-toolbar">Show toolbar</Label>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

// Popover with actions
export const WithActions: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Actions</Button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="grid gap-2">
          <h4 className="font-medium leading-none">Actions</h4>
          <p className="text-sm text-muted-foreground">
            Common actions for this item.
          </p>
          <div className="grid gap-1 pt-2">
            <Button variant="outline" className="justify-start" size="sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add to favorites
            </Button>
            <Button variant="outline" className="justify-start" size="sm">
              <Check className="mr-2 h-4 w-4" />
              Mark as complete
            </Button>
            <Button
              variant="outline"
              className="justify-start text-red-500 hover:text-red-600"
              size="sm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mr-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete item
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

// Popover with selection
export const WithSelection: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-[200px] justify-between"
        >
          <span>Select category...</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <div className="grid">
          {["Electronics", "Clothing", "Books", "Home & Garden", "Sports"].map(
            (category) => (
              <div
                key={category}
                className="flex cursor-pointer items-center px-3 py-2 hover:bg-accent rounded-sm"
              >
                {category}
              </div>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  ),
};

// Popover with custom styling
export const CustomStyling: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
          Custom Popover
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/40 dark:to-indigo-900/40 dark:border-blue-800">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none text-blue-700 dark:text-blue-300">
              Custom Styled Popover
            </h4>
            <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
              This popover has custom styling to match your brand.
            </p>
          </div>
          <div className="grid gap-2">
            <Input
              className="border-blue-200 dark:border-blue-800"
              placeholder="Enter text..."
            />
            <Button className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
              Confirm
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

// Positioned popovers
export const PositionedPopovers: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center justify-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Top</Button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-40 text-center">
          <p className="text-sm text-muted-foreground">
            This popover appears on top
          </p>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Right</Button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-40 text-center">
          <p className="text-sm text-muted-foreground">
            This popover appears on the right
          </p>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Bottom</Button>
        </PopoverTrigger>
        <PopoverContent side="bottom" className="w-40 text-center">
          <p className="text-sm text-muted-foreground">
            This popover appears on the bottom
          </p>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline">Left</Button>
        </PopoverTrigger>
        <PopoverContent side="left" className="w-40 text-center">
          <p className="text-sm text-muted-foreground">
            This popover appears on the left
          </p>
        </PopoverContent>
      </Popover>
    </div>
  ),
};
