import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarFallback, AvatarImage } from "../dist";

const meta: Meta<typeof Avatar> = {
  title: "Design System/Avatar",
  component: Avatar,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    docs: {
      description: {
        component: `
**Avatar Component**

Displays a circular image representation of a user or entity, with support for a fallback state if the image fails to load or is not provided. Built upon the Radix UI Avatar primitive.

**Core Components:**
*   \`<Avatar>\`: The root container component. Provides context and styling for the avatar shape (typically circular).
*   \`<AvatarImage>\`: The image element. Accepts standard image attributes like \`src\` and \`alt\`. It handles the image loading state.
*   \`<AvatarFallback>\`: The content displayed as a fallback. This is rendered if the \`<AvatarImage>\` is not provided, fails to load, or while the image is loading (can be configured with \`delayMs\` on the fallback). Often contains initials or an icon.

**Key Features:**
*   Graceful fallback mechanism ensures content is always displayed.
*   Automatically handles image loading states.
*   Easily customizable size and styling via CSS classes applied to the root \`<Avatar>\` component.
*   Accessible, providing appropriate roles and attributes.

See the [shadcn/ui Avatar documentation](https://ui.shadcn.com/docs/components/avatar) for more details and examples.
        `,
      },
    },
  },
  // Note: Props like `src`, `alt` are on AvatarImage, and children are used for Fallback.
  // The root Avatar component itself doesn't have many direct props for autodocs.
};

export default meta;

type Story = StoryObj<typeof Avatar>;

// Basic avatar with image
export const WithImage: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "A standard avatar displaying an image. If the image loads successfully, the fallback is hidden.",
      },
    },
  },
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
};

// Avatar with fallback
export const WithFallback: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the fallback behavior. If the \`AvatarImage\` fails to load (e.g., broken src), the \`AvatarFallback\` content (initials 'JD' in this case) is displayed.",
      },
    },
  },
  render: () => (
    <Avatar>
      <AvatarImage src="/broken-image.jpg" alt="@user" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

// Custom sized avatar
export const CustomSize: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Avatars can be resized by applying utility classes (like Tailwind's `size-*` or `w-* h-*`) to the root \`<Avatar>\` element.",
      },
    },
  },
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar className="size-10">
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar className="size-16">
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <Avatar className="size-20">
        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    </div>
  ),
};

// Custom styled avatar
export const CustomStyled: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Shows how to apply custom styles, like borders or background/text colors for the fallback, using CSS classes.",
      },
    },
  },
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar className="border-2 border-blue-500">
        <AvatarFallback className="bg-blue-100 text-blue-800">
          AB
        </AvatarFallback>
      </Avatar>
      <Avatar className="border-2 border-green-500">
        <AvatarFallback className="bg-green-100 text-green-800">
          CD
        </AvatarFallback>
      </Avatar>
      <Avatar className="border-2 border-amber-500">
        <AvatarFallback className="bg-amber-100 text-amber-800">
          EF
        </AvatarFallback>
      </Avatar>
    </div>
  ),
};

// Avatar with different fallback content
export const FallbackVariants: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "The \`AvatarFallback\` can contain various types of content, such as text, initials, or even icons.",
      },
    },
  },
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>
          <span className="text-xs">User</span>
        </AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4"
          >
            <path
              fillRule="evenodd"
              d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
              clipRule="evenodd"
            />
          </svg>
        </AvatarFallback>
      </Avatar>
    </div>
  ),
};
