import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
  Button,
  Input,
  Label,
} from "../dist";

const meta: Meta<typeof Drawer> = {
  title: "Design System/Drawer",
  component: Drawer,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Drawer Component**

A responsive and interactive panel that slides in from the edge of the screen, commonly used for navigation, forms, or displaying supplementary content, especially on mobile devices. Built upon the \`vaul\` library, adapted for shadcn/ui styling.

**Core Components (from \`vaul\`):**
*   \`<Drawer>\` (aliased from \`Vaul.Root\`): The root component managing the drawer state and context.
*   \`<DrawerTrigger>\` (aliased from \`Vaul.Trigger\`): The element (usually a button) that opens the drawer.
*   \`<DrawerPortal>\` (aliased from \`Vaul.Portal\`): Renders the drawer content into the document body.
*   \`<DrawerOverlay>\` (aliased from \`Vaul.Overlay\`): The semi-transparent background layer shown behind the drawer.
*   \`<DrawerContent>\` (aliased from \`Vaul.Content\`): The main container for the drawer's content that slides into view. Accepts \`className\` for styling.
*   \`<DrawerHeader>\`: A semantic container (\`<div>\`) for the top section, typically holding title and description.
*   \`<DrawerTitle>\` (aliased from \`Vaul.Title\`): The main heading (\`<h2>\`) within the header.
*   \`<DrawerDescription>\` (aliased from \`Vaul.Description\`): Supporting text (\`<p>\`) within the header.
*   \`<DrawerFooter>\`: A semantic container (\`<div>\`) for the bottom section, often for action buttons.
*   \`<DrawerClose>\` (aliased from \`Vaul.Close\`): A button specifically designed to close the drawer.

**Key Features & Props (from \`vaul\`):**
*   **Responsive**: Designed with mobile interactions in mind (swipe-to-close).
*   **Direction (\`direction\` prop):** Controls which edge the drawer slides from ('top', 'bottom', 'left', 'right'). Default is typically 'bottom'.
*   **Snap Points**: Supports defining snap points (\`snapPoints\` prop) for intermediate open states, especially useful for bottom sheets.
*   **State Management**: Supports controlled (\`open\`, \`onOpenChange\`) and uncontrolled behavior.
*   **Background Scaling (\`shouldScaleBackground\` prop):** Optionally scales down the background page content when the drawer is open (default: true).
*   **Accessibility**: \`vaul\` aims to provide accessible dialog behavior.

See the [shadcn/ui Drawer documentation](https://ui.shadcn.com/docs/components/drawer) and the [Vaul documentation](https://vaul.emilkowal.ski/) for more details.
        `,
      },
    },
  },
  argTypes: {
    direction: {
      control: "select",
      options: ["top", "bottom", "left", "right"],
      description: "The direction from which the drawer slides in.",
      table: {
        defaultValue: { summary: "bottom" },
      },
    },
    open: {
      control: "boolean",
      description: "Controlled open state.",
    },
    onOpenChange: {
      action: "onOpenChange",
      description: "Callback when the open state changes.",
    },
    shouldScaleBackground: {
      control: "boolean",
      description:
        "Whether the background should scale down when the drawer is open.",
      table: {
        defaultValue: { summary: true },
      },
    },
    // Other props from Vaul like snapPoints, activeSnapPoint, etc. are available but not explicitly listed here.
  },
};

export default meta;

type Story = StoryObj<typeof Drawer>;

// Basic bottom drawer
export const Bottom: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The default drawer behavior, sliding up from the bottom. Ideal for mobile interfaces.",
      },
    },
  },
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Bottom Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Bottom Drawer</DrawerTitle>
          <DrawerDescription>
            This is a drawer component that slides up from the bottom of the
            screen.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Drawers are perfect for mobile interfaces when you need contextual
            actions or information without navigating to a new page.
          </p>
        </div>
        <DrawerFooter>
          <Button>Save changes</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

// Top drawer
export const Top: Story = {
  args: {
    direction: "top",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A drawer sliding down from the top, useful for notifications or quick settings.",
      },
    },
  },
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Top Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Top Drawer</DrawerTitle>
          <DrawerDescription>
            This drawer slides down from the top of the screen.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Top drawers can be useful for notifications, filters, or quick
            actions.
          </p>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button>Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

// Left drawer
export const Left: Story = {
  args: {
    direction: "left",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A drawer sliding in from the left, commonly used for side navigation menus.",
      },
    },
  },
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Left Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Left Drawer</DrawerTitle>
          <DrawerDescription>
            This drawer slides in from the left side.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Left drawers are commonly used for navigation menus in responsive
            layouts.
          </p>
          <div className="mt-4 space-y-1">
            <div className="px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer dark:hover:bg-neutral-800">
              Dashboard
            </div>
            <div className="px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer dark:hover:bg-neutral-800">
              Profile
            </div>
            <div className="px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer dark:hover:bg-neutral-800">
              Settings
            </div>
            <div className="px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer dark:hover:bg-neutral-800">
              Help & Support
            </div>
          </div>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Close Menu
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

// Right drawer
export const Right: Story = {
  args: {
    direction: "right",
  },
  parameters: {
    docs: {
      description: {
        story:
          "A drawer sliding in from the right, suitable for context panels or details.",
      },
    },
  },
  render: (args) => (
    <Drawer {...args}>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Right Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Right Drawer</DrawerTitle>
          <DrawerDescription>
            This drawer slides in from the right side.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground">
            Right drawers can be used for supplementary information, user
            profiles, or settings panels.
          </p>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

// Drawer with form
export const WithForm: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates embedding a form within a drawer for tasks like editing profiles.",
      },
    },
  },
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>Edit Profile</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit profile</DrawerTitle>
          <DrawerDescription>
            Make changes to your profile here. Click save when you're done.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              defaultValue="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter your username"
              defaultValue="johndoe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              defaultValue="john.doe@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              rows={3}
              placeholder="Tell us about yourself"
              defaultValue="I'm a software developer with a passion for UI/UX design."
            />
          </div>
        </div>
        <DrawerFooter>
          <Button>Save changes</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

// Nested drawers
export const NestedDrawers: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows how drawers can be nested within each other, useful for multi-step processes or hierarchical information.",
      },
    },
  },
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Main Drawer</DrawerTitle>
          <DrawerDescription>
            This drawer contains another nested drawer.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-4">
            Click the button below to open a nested drawer.
          </p>
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="secondary">Open Nested Drawer</Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Nested Drawer</DrawerTitle>
                <DrawerDescription>
                  This is a drawer inside another drawer.
                </DrawerDescription>
              </DrawerHeader>
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Nested drawers can be useful for progressive disclosure of
                  information or multi-step forms.
                </p>
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button>Close</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

// Customized drawer
export const CustomizedDrawer: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates applying custom styling and structure, like a shopping cart example with a distinct header, item list, and summary footer.",
      },
    },
  },
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>Shopping Cart</Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85vh] sm:max-w-md">
        <div className="bg-primary p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 2L3 6V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V6L18 2H6Z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 6H21"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 10C16 11.0609 15.5786 12.0783 14.8284 12.8284C14.0783 13.5786 13.0609 14 12 14C10.9391 14 9.92172 13.5786 9.17157 12.8284C8.42143 12.0783 8 11.0609 8 10"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h2 className="text-xl font-bold text-white">Your Cart</h2>
            </div>
            <DrawerClose className="rounded-full bg-primary-foreground/10 p-1 hover:bg-primary-foreground/20">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 6L18 18"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </DrawerClose>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-4">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between border-b pb-4"
              >
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded bg-neutral-100 dark:bg-neutral-800"></div>
                  <div>
                    <h3 className="font-medium">Product Name</h3>
                    <p className="text-sm text-muted-foreground">
                      Small / Black
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <button className="h-5 w-5 rounded-full border inline-flex items-center justify-center">
                        -
                      </button>
                      <span className="text-sm">1</span>
                      <button className="h-5 w-5 rounded-full border inline-flex items-center justify-center">
                        +
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-medium">$99.00</span>
                  <button className="ml-2 text-sm text-muted-foreground hover:text-destructive">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 6H5H21"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DrawerFooter className="border-t">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>$198.00</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>Free</span>
            </div>
            <div className="flex items-center justify-between font-bold">
              <span>Total</span>
              <span>$198.00</span>
            </div>
            <Button className="w-full">Checkout</Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Continue Shopping
              </Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};
