import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../dist";
import {
  BellIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon,
  ArrowRightIcon,
  LoaderCircleIcon,
} from "lucide-react";

const meta: Meta<typeof Button> = {
  title: "Design System/Buttons/Button",
  component: Button,
  argTypes: {
    variant: {
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
      control: { type: "select" },
    },
    size: {
      options: ["default", "sm", "lg", "icon"],
      control: { type: "select" },
    },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

// Default button
export const Default: Story = {
  render: () => <Button>Click me</Button>,
};

// All button variants
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

// Button sizes
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <PlusIcon />
      </Button>
    </div>
  ),
};

// Buttons with icons
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button>
        <BellIcon />
        Notifications
      </Button>
      <Button variant="outline">
        <CheckIcon />
        Confirm
      </Button>
      <Button variant="destructive">
        <TrashIcon />
        Delete
      </Button>
      <Button variant="secondary">
        Next
        <ArrowRightIcon />
      </Button>
    </div>
  ),
};

// Icon buttons
export const IconButtons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button size="icon" variant="default">
        <PlusIcon />
        <span className="sr-only">Add item</span>
      </Button>
      <Button size="icon" variant="outline">
        <CheckIcon />
        <span className="sr-only">Confirm</span>
      </Button>
      <Button size="icon" variant="destructive">
        <TrashIcon />
        <span className="sr-only">Delete</span>
      </Button>
      <Button size="icon" variant="secondary">
        <ArrowRightIcon />
        <span className="sr-only">Next</span>
      </Button>
      <Button size="icon" variant="ghost">
        <BellIcon />
        <span className="sr-only">Notifications</span>
      </Button>
    </div>
  ),
};

// Disabled state
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button disabled>Disabled</Button>
      <Button disabled variant="destructive">
        Disabled
      </Button>
      <Button disabled variant="outline">
        Disabled
      </Button>
      <Button disabled variant="secondary">
        Disabled
      </Button>
      <Button disabled variant="ghost">
        Disabled
      </Button>
      <Button disabled variant="link">
        Disabled
      </Button>
    </div>
  ),
};

// Loading state
export const Loading: Story = {
  render: function LoadingButtons() {
    return (
      <div className="flex flex-wrap gap-4">
        <Button disabled>
          <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
          Loading
        </Button>
        <Button disabled variant="destructive">
          <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
          Loading
        </Button>
        <Button disabled variant="outline">
          <LoaderCircleIcon className="mr-2 size-4 animate-spin" />
          Loading
        </Button>
      </div>
    );
  },
};

// As child example (with anchor)
export const AsChild: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button asChild>
        <a href="#">Link that looks like a button</a>
      </Button>
      <Button variant="outline" asChild>
        <a href="#">Outline link</a>
      </Button>
    </div>
  ),
};

// Button group
export const ButtonGroup: Story = {
  render: () => (
    <div className="inline-flex flex-wrap gap-1 rounded-md border p-1">
      <Button variant="secondary">Profile</Button>
      <Button variant="ghost">Settings</Button>
      <Button variant="ghost">Messages</Button>
    </div>
  ),
};

// Custom styled button
export const CustomStyled: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800">
        <PlusIcon className="size-4" />
        Custom Blue
      </Button>
      <Button className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600">
        Gradient
      </Button>
    </div>
  ),
};
