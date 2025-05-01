import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button,
  Input,
  Label,
} from "../dist";

const meta: Meta<typeof Dialog> = {
  title: "Design System/Dialogs/Normal Dialog",
  component: Dialog,
};

export default meta;

type Story = StoryObj<typeof Dialog>;

// Basic dialog example
export const Basic: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Basic Dialog</DialogTitle>
          <DialogDescription>
            This is a basic dialog component with a title and description.
          </DialogDescription>
        </DialogHeader>
        <p className="py-4">
          Dialog content goes here. This can include any content you want to
          show in your dialog.
        </p>
      </DialogContent>
    </Dialog>
  ),
};

// Dialog with form
export const WithForm: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Edit Profile</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" defaultValue="John Doe" className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Username
            </Label>
            <Input
              id="username"
              defaultValue="@johndoe"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// Confirmation dialog
export const Confirmation: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete Item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="destructive">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// Custom styled dialog
export const CustomStyled: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"
        >
          Open Custom Dialog
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gradient-to-br from-purple-50 to-blue-50 border-blue-200">
        <DialogHeader>
          <DialogTitle className="text-blue-700">
            Custom Styled Dialog
          </DialogTitle>
          <DialogDescription className="text-blue-600/80">
            This dialog has custom styling applied to demonstrate theming
            capabilities.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 text-blue-700">
          <p>Custom dialogs can match your brand colors and design system.</p>
        </div>
        <DialogFooter>
          <Button className="bg-blue-600 hover:bg-blue-700">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
