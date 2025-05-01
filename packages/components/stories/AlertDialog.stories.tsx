import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from "../dist";

const meta: Meta<typeof AlertDialog> = {
  title: "Design System/Dialogs/Alert Dialog",
  component: AlertDialog,
};

export default meta;

type Story = StoryObj<typeof AlertDialog>;

// Basic alert dialog
export const Basic: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

// Custom styled alert dialog
export const Custom: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="border-yellow-500 text-yellow-600">
          Confirm Action
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-yellow-200">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-yellow-600">
            Confirm Your Decision
          </AlertDialogTitle>
          <AlertDialogDescription className="text-yellow-700">
            Please confirm that you want to proceed with this important action.
            Make sure you have saved any changes before continuing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-yellow-200 text-yellow-700">
            Go Back
          </AlertDialogCancel>
          <AlertDialogAction className="bg-yellow-500 text-white hover:bg-yellow-600">
            I'm Sure
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

// Information alert dialog
export const Information: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Show Information</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Important Information</AlertDialogTitle>
          <AlertDialogDescription>
            This is an informational alert dialog that provides crucial details
            to the user. No destructive action will be performed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Acknowledge</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
