import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { AspectRatio } from "../dist";

const meta: Meta<typeof AspectRatio> = {
  title: "Design System/Aspect Ratio",
  component: AspectRatio,
};

export default meta;

type Story = StoryObj<typeof AspectRatio>;

// Square (1:1)
export const Square: Story = {
  render: () => (
    <div className="w-[300px]">
      <AspectRatio ratio={1 / 1}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          className="rounded-md object-cover w-full h-full"
        />
      </AspectRatio>
    </div>
  ),
};

// Standard landscape (16:9)
export const Landscape: Story = {
  render: () => (
    <div className="w-[300px]">
      <AspectRatio ratio={16 / 9}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          className="rounded-md object-cover w-full h-full"
        />
      </AspectRatio>
    </div>
  ),
};

// Portrait (3:4)
export const Portrait: Story = {
  render: () => (
    <div className="w-[200px]">
      <AspectRatio ratio={3 / 4}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          className="rounded-md object-cover w-full h-full"
        />
      </AspectRatio>
    </div>
  ),
};

// Ultrawide (21:9)
export const Ultrawide: Story = {
  render: () => (
    <div className="w-[400px]">
      <AspectRatio ratio={21 / 9}>
        <img
          src="https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?w=800&dpr=2&q=80"
          alt="Photo by Drew Beamer"
          className="rounded-md object-cover w-full h-full"
        />
      </AspectRatio>
    </div>
  ),
};

// With content other than image
export const WithContent: Story = {
  render: () => (
    <div className="w-[300px]">
      <AspectRatio ratio={16 / 9}>
        <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800 rounded-md">
          <p className="text-sm font-medium">16:9 Aspect Ratio</p>
        </div>
      </AspectRatio>
    </div>
  ),
};

// Multiple aspect ratios comparison
export const Comparison: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1">Square (1:1)</p>
        <div className="w-full max-w-[200px]">
          <AspectRatio ratio={1 / 1}>
            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800 rounded-md">
              <p className="text-xs">1:1</p>
            </div>
          </AspectRatio>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-1">Landscape (16:9)</p>
        <div className="w-full max-w-[200px]">
          <AspectRatio ratio={16 / 9}>
            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800 rounded-md">
              <p className="text-xs">16:9</p>
            </div>
          </AspectRatio>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-1">Portrait (3:4)</p>
        <div className="w-full max-w-[150px]">
          <AspectRatio ratio={3 / 4}>
            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800 rounded-md">
              <p className="text-xs">3:4</p>
            </div>
          </AspectRatio>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-1">Ultrawide (21:9)</p>
        <div className="w-full max-w-[300px]">
          <AspectRatio ratio={21 / 9}>
            <div className="flex items-center justify-center w-full h-full bg-neutral-100 dark:bg-neutral-800 rounded-md">
              <p className="text-xs">21:9</p>
            </div>
          </AspectRatio>
        </div>
      </div>
    </div>
  ),
};
