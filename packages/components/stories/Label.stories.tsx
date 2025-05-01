import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Label,
  Input,
  Checkbox,
  RadioGroup,
  RadioGroupItem,
  Switch,
} from "../dist";

const meta: Meta<typeof Label> = {
  title: "Design System/Label",
  component: Label,
  parameters: {
    layout: "centered",
  },
};

export default meta;
type Story = StoryObj<typeof Label>;

// Basic label
export const Default: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Label htmlFor="example">Example Label</Label>
      <Input id="example" />
    </div>
  ),
};

// Label with required indicator
export const Required: Story = {
  render: () => (
    <div className="flex flex-col space-y-2 w-64">
      <Label
        htmlFor="required"
        className="after:content-['*'] after:ml-0.5 after:text-red-500"
      >
        Required Field
      </Label>
      <Input id="required" required />
    </div>
  ),
};

// Label for checkbox
export const WithCheckbox: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
};

// Label for radio group
export const WithRadioGroup: Story = {
  render: () => (
    <RadioGroup defaultValue="option-one" className="space-y-2">
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-one" id="option-one" />
        <Label htmlFor="option-one">Option One</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-two" id="option-two" />
        <Label htmlFor="option-two">Option Two</Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="option-three" id="option-three" />
        <Label htmlFor="option-three">Option Three</Label>
      </div>
    </RadioGroup>
  ),
};

// Label for switch
export const WithSwitch: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
};

// Label sizes
export const Sizes: Story = {
  render: () => (
    <div className="space-y-6 w-64">
      <div className="space-y-1">
        <Label htmlFor="small" className="text-xs">
          Small Label
        </Label>
        <Input id="small" placeholder="Small input" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="medium">Medium Label (Default)</Label>
        <Input id="medium" placeholder="Medium input" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="large" className="text-lg">
          Large Label
        </Label>
        <Input id="large" placeholder="Large input" />
      </div>
    </div>
  ),
};

// Disabled label
export const Disabled: Story = {
  render: () => (
    <div className="flex flex-col space-y-2 w-64">
      <Label htmlFor="disabled" className="text-muted-foreground">
        Disabled Field
      </Label>
      <Input id="disabled" disabled />
    </div>
  ),
};

// Label with description
export const WithDescription: Story = {
  render: () => (
    <div className="space-y-1 w-64">
      <Label htmlFor="with-description">Username</Label>
      <p className="text-xs text-muted-foreground">
        This will be displayed on your public profile.
      </p>
      <Input id="with-description" />
    </div>
  ),
};

// Form with multiple labeled inputs
export const FormExample: Story = {
  render: () => (
    <form className="space-y-6 w-80">
      <div className="space-y-1">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" placeholder="John Doe" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="john@example.com" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" />
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters.
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="remember" />
        <Label htmlFor="remember">Remember me</Label>
      </div>
    </form>
  ),
};
