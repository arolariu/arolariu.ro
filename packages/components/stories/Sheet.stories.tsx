import type {Meta, StoryObj} from "@storybook/react";
import {
  Button,
  Input,
  Label,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../dist";

const meta: Meta<typeof Sheet> = {
  title: "Design System/Sheet",
  component: Sheet,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Sheet Component**

A modal panel that slides in from one of the edges of the screen (top, bottom, left, or right). Often used for navigation menus, forms, or supplementary details, especially in mobile-first designs. This component is essentially a pre-configured \`<Dialog>\` with specific animations and positioning for the slide-in effect.

**Core Components (Composition based on Dialog):**
*   \`<Sheet>\`: The root component managing the sheet's open state (equivalent to \`<Dialog>\`).
*   \`<SheetTrigger>\`: The element (usually a \`<Button>\`) that opens the sheet (equivalent to \`<DialogTrigger>\`).
*   \`<SheetPortal>\`: (Used internally by \`<SheetContent>\`) Renders content into the document body.
*   \`<SheetOverlay>\`: The background overlay layer (equivalent to \`<DialogOverlay>\`).
*   \`<SheetContent>\`: The main container for the sheet's content that slides into view. Accepts a \`side\` prop ('top', 'bottom', 'left', 'right') to control the origin and applies appropriate animations and positioning. Includes a close button by default. (Equivalent to \`<DialogContent>\` with added side-specific variants).
*   \`<SheetHeader>\`: A semantic container (\`<div>\`) for the top section, typically holding title and description.
*   \`<SheetTitle>\`: The main heading (\`<h2>\`) within the header (equivalent to \`<DialogTitle>\`).
*   \`<SheetDescription>\`: Supporting text (\`<p>\`) within the header (equivalent to \`<DialogDescription>\`).
*   \`<SheetFooter>\`: A semantic container (\`<div>\`) for the bottom section, often for action buttons.
*   \`<SheetClose>\`: A button specifically designed to close the sheet (equivalent to \`<DialogClose>\`).

**Key Features:**
*   **Slide-in Animation**: Provides distinct animations based on the \`side\` prop ('top', 'bottom', 'left', 'right') specified on \`<SheetContent>\`.
*   **Modal Behavior**: Inherits the modal behavior from the underlying Dialog primitive (focus trapping, prevents interaction outside).
*   **Accessibility**: Inherits accessibility features from Radix UI Dialog (ARIA roles, keyboard navigation).
*   **Responsive**: Commonly used for mobile navigation patterns but works on all screen sizes.

See the [shadcn/ui Sheet documentation](https://ui.shadcn.com/docs/components/sheet) for more details and examples. It builds upon the concepts of the Dialog component.
        `,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Sheet>;

// Basic sheet (right side)
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A basic Sheet example sliding in from the right side (default). Contains a title, description, form elements, and a footer with a close button.",
      },
    },
  },
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='outline'>Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit Profile</SheetTitle>
          <SheetDescription>Make changes to your profile here. Click save when you're done.</SheetDescription>
        </SheetHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label
              htmlFor='name'
              className='text-right'>
              Name
            </Label>
            <Input
              id='name'
              value='John Doe'
              className='col-span-3'
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label
              htmlFor='username'
              className='text-right'>
              Username
            </Label>
            <Input
              id='username'
              value='@johndoe'
              className='col-span-3'
            />
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button type='submit'>Save changes</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

// Left side sheet
export const Left: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates a Sheet configured to slide in from the left side of the screen.",
      },
    },
  },
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='outline'>Open Left Sheet</Button>
      </SheetTrigger>
      <SheetContent side='left'>
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <SheetDescription>Navigation and settings menu.</SheetDescription>
        </SheetHeader>
        <div className='flex flex-col space-y-3 py-4'>
          <Button
            variant='ghost'
            className='justify-start'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='mr-2 h-4 w-4'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'>
              <path d='m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
              <polyline points='9 22 9 12 15 12 15 22' />
            </svg>
            Home
          </Button>
          <Button
            variant='ghost'
            className='justify-start'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='mr-2 h-4 w-4'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'>
              <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
              <circle
                cx='9'
                cy='7'
                r='4'
              />
              <path d='M22 21v-2a4 4 0 0 0-3-3.87' />
              <path d='M16 3.13a4 4 0 0 1 0 7.75' />
            </svg>
            Users
          </Button>
          <Button
            variant='ghost'
            className='justify-start'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='mr-2 h-4 w-4'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'>
              <rect
                width='20'
                height='14'
                x='2'
                y='5'
                rx='2'
              />
              <line
                x1='2'
                x2='22'
                y1='10'
                y2='10'
              />
            </svg>
            Billing
          </Button>
          <Button
            variant='ghost'
            className='justify-start'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              className='mr-2 h-4 w-4'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'>
              <circle
                cx='12'
                cy='12'
                r='3'
              />
              <path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z' />
            </svg>
            Settings
          </Button>
        </div>
        <SheetFooter className='absolute right-0 bottom-0 left-0 p-4'>
          <Button
            variant='outline'
            className='w-full'>
            Log Out
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

// Top sheet
export const Top: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates a Sheet configured to slide in from the top of the screen.",
      },
    },
  },
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='outline'>Open Top Sheet</Button>
      </SheetTrigger>
      <SheetContent
        side='top'
        className='h-[30%]'>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>Recent notifications and updates.</SheetDescription>
        </SheetHeader>
        <div className='py-4'>
          <div className='space-y-4'>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className='flex items-start gap-4'>
                <div className='h-10 w-10 rounded-full bg-neutral-100 dark:bg-neutral-800'></div>
                <div className='flex-1'>
                  <h4 className='text-sm font-semibold'>New Message</h4>
                  <p className='text-sm text-neutral-500 dark:text-neutral-400'>User {i} sent you a message</p>
                  <span className='text-xs text-neutral-400 dark:text-neutral-500'>
                    {i} minute{i > 1 ? "s" : ""} ago
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <SheetFooter>
          <Button
            variant='link'
            className='w-full'>
            View all notifications
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

// Bottom sheet
export const Bottom: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates a Sheet configured to slide in from the bottom of the screen.",
      },
    },
  },
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='outline'>Open Bottom Sheet</Button>
      </SheetTrigger>
      <SheetContent
        side='bottom'
        className='h-[40%]'>
        <SheetHeader>
          <SheetTitle>Share</SheetTitle>
          <SheetDescription>Share this content with your friends and followers.</SheetDescription>
        </SheetHeader>
        <div className='grid grid-cols-4 gap-4 py-4'>
          {["Twitter", "Facebook", "Instagram", "Email", "LinkedIn", "Message", "Telegram", "WhatsApp"].map((platform) => (
            <Button
              key={platform}
              variant='outline'
              className='flex h-20 flex-col items-center justify-center gap-1'>
              <div className='h-6 w-6 rounded-full bg-neutral-100 dark:bg-neutral-800'></div>
              <span className='text-xs'>{platform}</span>
            </Button>
          ))}
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button
              variant='outline'
              className='w-full'>
              Cancel
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};

// Multiple sheet sizes
export const Sizes: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows how to customize the size (width or height depending on the side) of the Sheet content area using CSS classes.",
      },
    },
  },
  render: () => (
    <div className='flex flex-wrap gap-4'>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant='outline'>Default Size</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Default Width (428px)</SheetTitle>
            <SheetDescription>The default sheet size for side sheets.</SheetDescription>
          </SheetHeader>
          <div className='py-4'>
            <p>This is the standard sheet size that works well for most use cases.</p>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant='outline'>Small Size</Button>
        </SheetTrigger>
        <SheetContent className='sm:max-w-[300px]'>
          <SheetHeader>
            <SheetTitle>Small Width (300px)</SheetTitle>
            <SheetDescription>A smaller sheet for simpler content.</SheetDescription>
          </SheetHeader>
          <div className='py-4'>
            <p>Use this size for minimal content or compact layouts.</p>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant='outline'>Large Size</Button>
        </SheetTrigger>
        <SheetContent className='sm:max-w-[540px]'>
          <SheetHeader>
            <SheetTitle>Large Width (540px)</SheetTitle>
            <SheetDescription>A larger sheet for more complex content.</SheetDescription>
          </SheetHeader>
          <div className='py-4'>
            <p>This size is suitable for more complex forms or detailed information that requires more horizontal space.</p>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant='outline'>Full Size</Button>
        </SheetTrigger>
        <SheetContent className='sm:max-w-full'>
          <SheetHeader>
            <SheetTitle>Full Width</SheetTitle>
            <SheetDescription>A sheet that takes the full width of the screen.</SheetDescription>
          </SheetHeader>
          <div className='py-4'>
            <p>Use this size for complex interfaces that need maximum space.</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  ),
};

// Custom styled sheet
export const CustomStyled: Story = {
  parameters: {
    docs: {
      description: {
        story: "A sheet with custom styling to match your application's design system.",
      },
    },
  },
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button className='bg-blue-600 hover:bg-blue-700'>Custom Sheet</Button>
      </SheetTrigger>
      <SheetContent className='border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:border-blue-900 dark:from-blue-950/50 dark:to-indigo-950/50'>
        <SheetHeader>
          <SheetTitle className='text-blue-700 dark:text-blue-300'>Custom Styled Sheet</SheetTitle>
          <SheetDescription className='text-blue-600/80 dark:text-blue-400/80'>
            A sheet with custom styling to match your brand.
          </SheetDescription>
        </SheetHeader>
        <div className='py-4 text-blue-700 dark:text-blue-300'>
          <p>This sheet demonstrates custom background colors, text colors, and border colors.</p>
          <p className='mt-2'>You can customize every aspect of the sheet to match your application's design system.</p>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button className='bg-blue-600 hover:bg-blue-700'>Close</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};
