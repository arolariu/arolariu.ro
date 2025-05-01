import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "../dist";

const meta: Meta<typeof Separator> = {
  title: "Design System/Separator",
  component: Separator,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: { type: "radio" },
      options: ["horizontal", "vertical"],
      description: "The orientation of the separator",
      defaultValue: "horizontal",
    },
    decorative: {
      control: "boolean",
      description: "Whether the separator is purely decorative",
      defaultValue: true,
    },
    className: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Default: Story = {
  args: {
    orientation: "horizontal",
    decorative: true,
  },
  render: (args) => (
    <div className="w-full max-w-md">
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Default Separator</h4>
        <p className="text-sm text-neutral-500">Content above the separator.</p>
      </div>
      <Separator className="my-4" {...args} />
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-none">Separated Content</h4>
        <p className="text-sm text-neutral-500">Content below the separator.</p>
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  args: {
    orientation: "vertical",
    decorative: true,
  },
  render: (args) => (
    <div className="flex h-16 items-center gap-4 max-w-md">
      <div>
        <h4 className="text-sm font-medium leading-none">Left Content</h4>
        <p className="text-sm text-neutral-500">Left of the separator.</p>
      </div>
      <Separator {...args} className="h-full" />
      <div>
        <h4 className="text-sm font-medium leading-none">Right Content</h4>
        <p className="text-sm text-neutral-500">Right of the separator.</p>
      </div>
    </div>
  ),
};

export const InList: Story = {
  render: () => (
    <div className="w-full max-w-md space-y-4">
      <h4 className="text-sm font-medium leading-none">List with Separators</h4>
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Item 1</h4>
        <p className="text-sm text-neutral-500">Item 1 description</p>
      </div>
      <Separator />
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Item 2</h4>
        <p className="text-sm text-neutral-500">Item 2 description</p>
      </div>
      <Separator />
      <div className="space-y-1">
        <h4 className="text-sm font-medium">Item 3</h4>
        <p className="text-sm text-neutral-500">Item 3 description</p>
      </div>
    </div>
  ),
};

export const InNavigation: Story = {
  render: () => (
    <div className="w-full max-w-md space-y-4">
      <h4 className="text-lg font-medium">Navigation Example</h4>
      <nav className="flex items-center gap-4">
        <a href="#" className="text-sm font-medium">
          Home
        </a>
        <Separator orientation="vertical" className="h-4" />
        <a href="#" className="text-sm font-medium">
          About
        </a>
        <Separator orientation="vertical" className="h-4" />
        <a href="#" className="text-sm font-medium">
          Products
        </a>
        <Separator orientation="vertical" className="h-4" />
        <a href="#" className="text-sm font-medium">
          Contact
        </a>
      </nav>
    </div>
  ),
};

export const InForm: Story = {
  render: () => (
    <div className="w-full max-w-md space-y-6">
      <h4 className="text-lg font-medium">Form with Separators</h4>
      <form className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center">
            <input type="checkbox" id="remember" className="mr-2" />
            <label htmlFor="remember" className="text-sm">
              Remember me
            </label>
          </div>
        </div>

        <Separator />

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-neutral-50 dark:text-neutral-900"
        >
          Sign In
        </button>
      </form>
    </div>
  ),
};

export const CustomStyling: Story = {
  render: () => (
    <div className="w-full max-w-md space-y-6">
      <h4 className="text-lg font-medium">Custom Styled Separators</h4>

      <div className="space-y-1">
        <h4 className="text-sm font-medium">Default Style</h4>
        <p className="text-sm text-neutral-500">Regular separator appearance</p>
      </div>
      <Separator className="my-4" />

      <div className="space-y-1">
        <h4 className="text-sm font-medium">Thicker Separator</h4>
        <p className="text-sm text-neutral-500">With increased thickness</p>
      </div>
      <Separator className="my-4 h-[2px]" />

      <div className="space-y-1">
        <h4 className="text-sm font-medium">Colored Separator</h4>
        <p className="text-sm text-neutral-500">With custom color</p>
      </div>
      <Separator className="my-4 bg-blue-500 dark:bg-blue-400" />

      <div className="space-y-1">
        <h4 className="text-sm font-medium">Gradient Separator</h4>
        <p className="text-sm text-neutral-500">With gradient background</p>
      </div>
      <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-neutral-500 to-transparent" />

      <div className="space-y-1">
        <h4 className="text-sm font-medium">Dashed Separator</h4>
        <p className="text-sm text-neutral-500">With dashed style</p>
      </div>
      <div className="my-4 h-px w-full border-t border-dashed border-neutral-300 dark:border-neutral-700" />
    </div>
  ),
};
