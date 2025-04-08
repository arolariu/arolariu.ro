import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./../dist";

const meta: Meta<typeof Dialog> = {
  title: "Design System/Dialog",
  component: Dialog,
};

type Story = StoryObj<typeof Dialog>;

export const Primary: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-red-500">
          View Dependencies
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader className="text-red-500">
          <DialogTitle className='text-blue-500'>Dependencies</DialogTitle>
          <DialogDescription className='font-black'>
            This package has 0 dependencies.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};

export default meta;
