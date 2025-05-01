import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Avatar, AvatarFallback, AvatarImage } from "../dist";

const meta: Meta<typeof Avatar> = {
  title: "Design System/Avatar",
  component: Avatar,
};

export default meta;

type Story = StoryObj<typeof Avatar>;

// Basic avatar with image
export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
      <AvatarFallback>CN</AvatarFallback>
    </Avatar>
  ),
};

// Avatar with fallback
export const WithFallback: Story = {
  render: () => (
    <Avatar>
      <AvatarImage src="/broken-image.jpg" alt="@user" />
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  ),
};

// Custom sized avatar
export const CustomSize: Story = {
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
