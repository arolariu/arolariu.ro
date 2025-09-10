import type {Meta, StoryObj} from "@storybook/react";
import {Button, Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "../dist";

const meta: Meta<typeof Card> = {
  title: "Design System/Cards/Card",
  component: Card,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Card Component**

A versatile container component used to group related content and actions, presented with distinct visual separation (e.g., border, background, shadow). Composed of several semantic sub-components.

**Core Components:**
*   \`<Card>\`: The main container element, typically a \`<div>\`. Provides the base styling (border, background, shadow, border-radius).
*   \`<CardHeader>\`: A container (\`<div>\`) for the top section of the card. Usually holds \`<CardTitle>\` and \`<CardDescription>\`. Provides spacing and layout for header elements. Includes an optional \`<CardAction>\` slot.
*   \`<CardTitle>\`: The main heading (\`<h3>\`) within the \`<CardHeader>\`.
*   \`<CardDescription>\`: Supporting text (\`<p>\`) within the \`<CardHeader>\`, often providing context for the title.
*   \`<CardContent>\`: The main body container (\`<div>\`) for the card's primary content. Provides padding.
*   \`<CardFooter>\`: A container (\`<div>\`) for the bottom section of the card. Often used for action buttons, summary information, or metadata. Provides padding and sometimes flex layout.
*   \`<CardAction>\`: An optional slot (\`<div>\`) within the \`<CardHeader>\`, typically floated to the right. Useful for placing quick actions like icons, buttons, or toggles related to the card's content.

**Key Features:**
*   Provides a structured and semantic way to organize content blocks.
*   Composable structure allows flexibility in including or omitting header, content, and footer sections.
*   Styling is primarily driven by Tailwind CSS utility classes, making customization straightforward.

See the [shadcn/ui Card documentation](https://ui.shadcn.com/docs/components/card) for more details and examples.
        `,
      },
    },
  },
  // Note: Most props are related to styling (className) or composition (children).
  // The structure is defined by the sub-components used.
};

export default meta;

type Story = StoryObj<typeof Card>;

// Basic card
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "A fundamental card structure including Header (with Title and Description), Content, and Footer.",
      },
    },
  },
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card Content</p>
      </CardContent>
      <CardFooter>
        <p>Card Footer</p>
      </CardFooter>
    </Card>
  ),
};

// Card with action
export const WithAction: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates using the optional \`<CardAction>\` slot within the \`<CardHeader>\` for placing actions like buttons or icons.",
      },
    },
  },
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader>
        <CardTitle>Notification</CardTitle>
        <CardDescription>You have a new message</CardDescription>
        <CardAction>
          <Button
            variant='outline'
            size='sm'>
            Mark as Read
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>John Doe sent you a message about the project deadline.</p>
      </CardContent>
      <CardFooter className='flex justify-between'>
        <Button
          variant='outline'
          size='sm'>
          Dismiss
        </Button>
        <Button size='sm'>View</Button>
      </CardFooter>
    </Card>
  ),
};

// Custom styled card
export const CustomStyled: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows how to apply custom styles (gradients, colors, borders) to the Card and its sub-components using CSS classes.",
      },
    },
  },
  render: () => (
    <Card className='w-[350px] border-blue-100 bg-gradient-to-br from-purple-50 to-blue-50 dark:border-blue-900 dark:from-purple-950/50 dark:to-blue-950/50'>
      <CardHeader>
        <CardTitle className='text-blue-700 dark:text-blue-300'>Premium Plan</CardTitle>
        <CardDescription className='text-blue-600/80 dark:text-blue-400/80'>Access all features</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className='space-y-2 text-blue-700 dark:text-blue-300'>
          <li className='flex items-center gap-2'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'>
              <path d='M20 6 9 17l-5-5' />
            </svg>
            Unlimited projects
          </li>
          <li className='flex items-center gap-2'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'>
              <path d='M20 6 9 17l-5-5' />
            </svg>
            Priority support
          </li>
          <li className='flex items-center gap-2'>
            <svg
              xmlns='http://www.w3.org/2000/svg'
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'>
              <path d='M20 6 9 17l-5-5' />
            </svg>
            Custom domains
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button className='w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600/90 dark:hover:bg-blue-700/90'>Upgrade Now</Button>
      </CardFooter>
    </Card>
  ),
};

// Multiple cards layout
export const MultipleCards: Story = {
  parameters: {
    docs: {
      description: {
        story: "Illustrates how multiple Card components can be arranged within a layout (e.g., a grid).",
      },
    },
  },
  render: () => (
    <div className='grid grid-cols-2 gap-4'>
      <Card>
        <CardHeader>
          <CardTitle>First Card</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Some content for the first card</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Second Card</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Some content for the second card</p>
        </CardContent>
      </Card>
    </div>
  ),
};
