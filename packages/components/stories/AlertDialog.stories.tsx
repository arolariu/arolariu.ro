import type {Meta, StoryObj} from "@storybook/react";
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
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Alert Dialog Component**

A modal dialog that interrupts the user's workflow to convey critical information or require confirmation for an action, typically one with destructive consequences. Built upon the Radix UI Dialog primitive, ensuring accessibility features like focus trapping and appropriate ARIA roles.

**Core Components:**
*   \`<AlertDialog>\`: The root component managing the dialog's open state and context.
*   \`<AlertDialogTrigger>\`: An element (usually a \`<Button>\`) that, when interacted with, opens the dialog.
*   \`<AlertDialogContent>\`: The modal window container that appears, overlaying the main content. It renders within a \`<AlertDialogPortal>\` by default. Handles styling and positioning.
*   \`<AlertDialogHeader>\`: A semantic container for the dialog's title and description.
*   \`<AlertDialogTitle>\`: The main heading (\`<h2>\`) of the alert dialog.
*   \`<AlertDialogDescription>\`: Supporting text (\`<p>\`) providing context or details about the alert.
*   \`<AlertDialogFooter>\`: A container typically holding the action buttons.
*   \`<AlertDialogCancel>\`: A button styled and pre-configured to close the dialog without performing the primary action. Automatically handles closing logic.
*   \`<AlertDialogAction>\`: A button styled and pre-configured to represent the confirmation or primary action. Often triggers an \`onClick\` handler before closing the dialog.

**Key Features:**
*   Modal behavior prevents interaction with the underlying page content.
*   Focus is automatically trapped within the dialog for accessibility.
*   Keyboard accessible (e.g., Escape key closes the dialog via Cancel).
*   Designed specifically for critical confirmations, differentiating it from a standard \`<Dialog>\`.

See the [shadcn/ui Alert Dialog documentation](https://ui.shadcn.com/docs/components/alert-dialog) for more details and examples.
        `,
      },
    },
  },
  // Note: Most props are on the sub-components, not the root AlertDialog.
  // We can document common patterns or sub-component props if needed,
  // but autodocs primarily works on the main component's props.
};

export default meta;

type Story = StoryObj<typeof AlertDialog>;

// Basic alert dialog
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "A standard alert dialog prompting the user to confirm a potentially destructive action (like deleting data).",
      },
    },
  },
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='destructive'>Delete Account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your account and remove your data from our servers.
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
  parameters: {
    docs: {
      description: {
        story: "Demonstrates applying custom styles to various parts of the Alert Dialog for unique visual theming.",
      },
    },
  },
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant='outline'
          className='border-yellow-500 text-yellow-600'>
          Confirm Action
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className='border-yellow-200'>
        <AlertDialogHeader>
          <AlertDialogTitle className='text-yellow-600'>Confirm Your Decision</AlertDialogTitle>
          <AlertDialogDescription className='text-yellow-700'>
            Please confirm that you want to proceed with this important action. Make sure you have saved any changes before continuing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className='border-yellow-200 text-yellow-700'>Go Back</AlertDialogCancel>
          <AlertDialogAction className='bg-yellow-500 text-white hover:bg-yellow-600'>I'm Sure</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

// Information alert dialog
export const Information: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "An example of using the Alert Dialog structure for informational messages that require acknowledgement, without a 'Cancel' option.",
      },
    },
  },
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant='outline'>Show Information</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Important Information</AlertDialogTitle>
          <AlertDialogDescription>
            This is an informational alert dialog that provides crucial details to the user. No destructive action will be performed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>Acknowledge</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};
