import type {Meta, StoryObj} from "@storybook/react";
import {Card, CardContent, CardFooter, CardHeader, Skeleton} from "../dist";

const meta: Meta<typeof Skeleton> = {
  title: "Design System/Skeleton",
  component: Skeleton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: `
**Skeleton Component**

Used to display a placeholder preview of content while data is loading. It improves perceived performance by rendering the shape of the expected content immediately.

**Core Component:**
*   \`<Skeleton>\`: A simple \`<div>\` element styled to appear as a placeholder.

**Key Features:**
*   **Placeholder**: Renders a gray, often animated (subtle pulse), shape that mimics the structure of the content being loaded.
*   **Styling**: Primarily styled using Tailwind CSS utility classes. Key classes include:
    *   \`animate-pulse\`: Applies the pulsing animation.
    *   \`bg-muted\` / \`bg-neutral-200\` etc.: Sets the background color.
    *   \`h-*\`, \`w-*\`: Define the height and width of the placeholder shape.
    *   \`rounded-*\`: Controls the border radius (e.g., \`rounded-full\` for avatar placeholders, \`rounded-md\` for cards).
*   **Composition**: Used by composing multiple \`<Skeleton>\` elements together to represent the layout of the loading content (e.g., combining rectangles for text lines and a circle for an avatar).

**Usage:**
*   Typically rendered conditionally based on a loading state. When loading is true, show the \`<Skeleton>\` structure; when false, show the actual content.
*   Apply height, width, and border-radius classes directly to the \`<Skeleton>\` component to match the dimensions of the content it represents.

See the [shadcn/ui Skeleton documentation](https://ui.shadcn.com/docs/components/skeleton) for more details and examples.
        `,
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Skeleton>;

// Basic skeleton shapes
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "A basic Skeleton placeholder with default dimensions (height and width).",
      },
    },
  },
  render: () => (
    <div className='flex items-center space-x-4'>
      <Skeleton className='h-12 w-12 rounded-full' />
      <div className='space-y-2'>
        <Skeleton className='h-4 w-[250px]' />
        <Skeleton className='h-4 w-[200px]' />
      </div>
    </div>
  ),
};

// Card skeleton
export const CardSkeleton: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A more complex Skeleton structure designed to resemble a card layout, including placeholders for an image, title, and text content.",
      },
    },
  },
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader className='gap-2'>
        <Skeleton className='h-5 w-1/2' />
        <Skeleton className='h-4 w-4/5' />
      </CardHeader>
      <CardContent className='flex flex-col space-y-2'>
        <Skeleton className='h-20 w-full rounded-md' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-4/5' />
        <Skeleton className='h-4 w-3/5' />
      </CardContent>
      <CardFooter>
        <Skeleton className='h-9 w-24' />
      </CardFooter>
    </Card>
  ),
};

// User card skeleton
export const UserCardSkeleton: Story = {
  parameters: {
    docs: {
      description: {
        story: "A Skeleton structure designed to resemble a user card layout, including placeholders for avatars and text content.",
      },
    },
  },
  render: () => (
    <div className='flex flex-col space-y-5'>
      <div className='flex items-center space-x-4'>
        <Skeleton className='h-12 w-12 rounded-full' />
        <div className='space-y-2'>
          <Skeleton className='h-4 w-[200px]' />
          <Skeleton className='h-4 w-[150px]' />
        </div>
      </div>
      <div className='flex items-center space-x-4'>
        <Skeleton className='h-12 w-12 rounded-full' />
        <div className='space-y-2'>
          <Skeleton className='h-4 w-[200px]' />
          <Skeleton className='h-4 w-[150px]' />
        </div>
      </div>
      <div className='flex items-center space-x-4'>
        <Skeleton className='h-12 w-12 rounded-full' />
        <div className='space-y-2'>
          <Skeleton className='h-4 w-[200px]' />
          <Skeleton className='h-4 w-[150px]' />
        </div>
      </div>
    </div>
  ),
};

// Table skeleton
export const TableSkeleton: Story = {
  parameters: {
    docs: {
      description: {
        story: "A Skeleton structure designed to resemble a table layout, including placeholders for rows and columns.",
      },
    },
  },
  render: () => (
    <div className='w-[600px] rounded-md border'>
      <div className='border-b px-4 py-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <Skeleton className='h-5 w-5' />
            <Skeleton className='h-5 w-20' />
          </div>
          <Skeleton className='h-8 w-24' />
        </div>
      </div>
      <div className='flex flex-col space-y-3 p-4'>
        {Array(5)
          .fill(null)
          .map((_, i) => (
            <div
              key={i}
              className='flex justify-between'>
              <div className='flex items-center space-x-4'>
                <Skeleton className='h-10 w-10 rounded-md' />
                <div className='space-y-2'>
                  <Skeleton className='h-4 w-[150px]' />
                  <Skeleton className='h-3 w-[120px]' />
                </div>
              </div>
              <Skeleton className='h-6 w-12' />
            </div>
          ))}
      </div>
    </div>
  ),
};

// Dashboard skeleton
export const DashboardSkeleton: Story = {
  parameters: {
    docs: {
      description: {
        story: "A Skeleton structure designed to resemble a dashboard layout, including placeholders for widgets and charts.",
      },
    },
  },
  render: () => (
    <div className='w-[600px] space-y-4'>
      <div className='flex items-center justify-between'>
        <div>
          <Skeleton className='h-8 w-[200px]' />
          <div className='mt-2 flex space-x-2'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-4 w-20' />
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          <Skeleton className='h-8 w-8 rounded-md' />
          <Skeleton className='h-8 w-20 rounded-md' />
        </div>
      </div>
      <div className='grid grid-cols-3 gap-4'>
        <Skeleton className='h-28 rounded-md' />
        <Skeleton className='h-28 rounded-md' />
        <Skeleton className='h-28 rounded-md' />
      </div>
      <div>
        <Skeleton className='mb-2 h-6 w-32' />
        <Skeleton className='h-32 w-full rounded-md' />
      </div>
    </div>
  ),
};

// Comment skeleton
export const CommentSkeleton: Story = {
  parameters: {
    docs: {
      description: {
        story: "A Skeleton structure designed to resemble a comment layout, including placeholders for avatars and text content.",
      },
    },
  },
  render: () => (
    <div className='w-[500px] space-y-4'>
      {Array(3)
        .fill(null)
        .map((_, i) => (
          <div
            key={i}
            className='flex space-x-4'>
            <Skeleton className='h-10 w-10 rounded-full' />
            <div className='w-full space-y-2'>
              <div className='flex items-center space-x-2'>
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-3 w-12' />
              </div>
              <Skeleton className='h-4 w-full' />
              <Skeleton className='h-4 w-3/4' />
              <div className='flex space-x-2'>
                <Skeleton className='h-6 w-12' />
                <Skeleton className='h-6 w-12' />
              </div>
            </div>
          </div>
        ))}
    </div>
  ),
};

// Custom colors
export const CustomColors: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates applying custom colors to the Skeleton component using CSS classes.",
      },
    },
  },
  render: () => (
    <div className='flex w-[300px] flex-col space-y-6'>
      <div className='space-y-2'>
        <div className='text-sm text-neutral-500'>Default</div>
        <Skeleton className='h-8 w-full' />
      </div>

      <div className='space-y-2'>
        <div className='text-sm text-neutral-500'>Blue</div>
        <Skeleton className='h-8 w-full bg-blue-100 dark:bg-blue-950' />
      </div>

      <div className='space-y-2'>
        <div className='text-sm text-neutral-500'>Green</div>
        <Skeleton className='h-8 w-full bg-green-100 dark:bg-green-950' />
      </div>

      <div className='space-y-2'>
        <div className='text-sm text-neutral-500'>Red</div>
        <Skeleton className='h-8 w-full bg-red-100 dark:bg-red-950' />
      </div>
    </div>
  ),
};
