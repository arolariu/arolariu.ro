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
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Dialog Component**

A modal window overlaid on the primary content, used for displaying information, forms, or requiring user interaction without navigating away from the current context. Built upon the Radix UI Dialog primitive, ensuring accessibility features like focus trapping and appropriate ARIA roles.

**Core Components:**
*   \`<Dialog>\`: The root component managing the dialog's open state and context. Accepts props like \`open\`, \`defaultOpen\`, \`onOpenChange\`, and \`modal\`.
*   \`<DialogTrigger>\`: An element (usually a \`<Button>\`) that, when interacted with, opens the dialog.
*   \`<DialogPortal>\`: (Used internally by \`<DialogContent>\`) Renders its children into a new element appended to the document body, ensuring the dialog appears above other content.
*   \`<DialogOverlay>\`: (Used internally by \`<DialogContent>\`) A layer that covers the underlying page content, often semi-transparent. Clicking it typically closes the dialog when \`modal\` is true.
*   \`<DialogContent>\`: The main modal window container that appears. Handles styling, positioning, animations, focus trapping, and accessibility attributes (\`role="dialog"\`, \`aria-modal\`, \`aria-labelledby\`, \`aria-describedby\`).
*   \`<DialogHeader>\`: A semantic container (\`<div>\`) for the dialog's title and description.
*   \`<DialogTitle>\`: The main heading (\`<h2>\`) of the dialog, automatically linked via \`aria-labelledby\` on the content.
*   \`<DialogDescription>\`: Supporting text (\`<p>\`) providing context, automatically linked via \`aria-describedby\` on the content.
*   \`<DialogFooter>\`: A container (\`<div>\`) typically holding action buttons (e.g., Save, Cancel).
*   \`<DialogClose>\`: A button specifically designed to close the dialog. Can be placed anywhere within the \`<DialogContent>\`.

**Key Features & Props (from Radix UI):**
*   **Modality (\`modal\` prop):** When true (default), prevents interaction with elements outside the dialog and traps focus within it. When false, allows interaction outside.
*   **State Management**: Supports controlled (\`open\`, \`onOpenChange\`) and uncontrolled (\`defaultOpen\`) state.
*   **Accessibility**: Manages focus, provides correct ARIA roles and attributes, and handles keyboard interactions (e.g., Escape key closes the dialog).
*   **Portal Rendering**: Ensures the dialog appears correctly above other page elements.

See the [shadcn/ui Dialog documentation](https://ui.shadcn.com/docs/components/dialog) and the [Radix UI Dialog documentation](https://www.radix-ui.com/primitives/docs/components/dialog) for more details.
        `,
      },
    },
  },
  argTypes: {
    open: {
      control: "boolean",
      description: "The controlled open state of the dialog.",
    },
    defaultOpen: {
      control: "boolean",
      description: "The initial open state when uncontrolled.",
    },
    onOpenChange: {
      action: "openChange",
      description: "Event handler called when the open state changes.",
    },
    modal: {
      control: "boolean",
      description:
        "When true, interaction with outside elements is disabled and focus is trapped within the dialog.",
      table: {
        defaultValue: { summary: "Lorem Ipsum" },
      },
    },
    // Props for DialogContent
    // onEscapeKeyDown, onPointerDownOutside, onInteractOutside, etc. are available on DialogContent
  },
};

export default meta;

type Story = StoryObj<typeof Dialog>;

// Basic dialog example
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A fundamental dialog structure with a trigger, content area, header (title and description), and implicit close behavior (clicking outside or pressing Esc).",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates embedding a form within a dialog, including input fields, labels, and a save button in the footer.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates a common use case for dialogs: confirming a potentially destructive action. Includes cancel and confirmation buttons in the footer.",
      },
    },
  },
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
  parameters: {
    docs: {
      description: {
        story:
          "Shows how to apply custom styles to the DialogTrigger and DialogContent using CSS classes for branding or theming.",
      },
    },
  },
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
