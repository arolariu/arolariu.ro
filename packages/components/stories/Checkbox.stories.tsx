import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "../dist";

const meta: Meta<typeof Checkbox> = {
  title: "Design System/Checkbox",
  component: Checkbox,
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

// Basic checkbox
export const Basic: Story = {
  render: () => <Checkbox />,
};

// Checked checkbox
export const Checked: Story = {
  render: () => <Checkbox defaultChecked />,
};

// Disabled checkbox
export const Disabled: Story = {
  render: () => <Checkbox disabled />,
};

// Disabled and checked checkbox
export const DisabledChecked: Story = {
  render: () => <Checkbox disabled defaultChecked />,
};

// With label
export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <label
        htmlFor="terms"
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Accept terms and conditions
      </label>
    </div>
  ),
};

// Checkbox group
export const CheckboxGroup: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox id="email" defaultChecked />
        <label
          htmlFor="email"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Email notifications
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="push" />
        <label
          htmlFor="push"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Push notifications
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="sms" />
        <label
          htmlFor="sms"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          SMS notifications
        </label>
      </div>
    </div>
  ),
};

// Error state checkbox
export const Error: Story = {
  render: () => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Checkbox id="error" aria-invalid="true" />
        <label
          htmlFor="error"
          className="text-sm font-medium leading-none text-red-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Required field
        </label>
      </div>
      <p className="text-xs text-red-500">This field is required</p>
    </div>
  ),
};
