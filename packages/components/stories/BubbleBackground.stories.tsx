import type {Meta, StoryObj} from "@storybook/react";
import {BubbleBackground} from "../dist";

const meta: Meta<typeof BubbleBackground> = {
  title: "Design System/Backgrounds/Bubble Background",
  component: BubbleBackground,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `
**Bubble Background Component**

A custom component that renders an animated background with floating, colored bubbles. Uses HTML canvas for rendering and animation.

**Key Features:**
*   Generates a dynamic background effect with moving and fading bubbles.
*   Highly customizable through props:
    *   \`bubbleCount\`: Controls the density of bubbles.
    *   \`minSize\`, \`maxSize\`: Define the size range of bubbles.
    *   \`minOpacity\`, \`maxOpacity\`: Control the transparency range.
    *   \`minVelocity\`, \`maxVelocity\`: Determine the speed range of bubbles.
    *   \`colors\`: An array of color strings (e.g., hex codes) to use for the bubbles.
*   Uses \`requestAnimationFrame\` for smooth animation performance.
*   Resizes automatically with the container element.

**Technical Details:**
*   Creates a \`<canvas>\` element positioned absolutely to fill its parent container.
*   Manages an array of bubble objects, each with properties like position, size, color, opacity, and velocity.
*   The animation loop updates each bubble's position and opacity, redrawing the canvas on each frame.
*   Bubbles reset their position when they move off-screen, creating a continuous effect.
        `,
      },
    },
  },
  argTypes: {
    className: {
      control: "text",
      description: "Additional CSS classes to apply to the component",
    },
    bubbleCount: {
      control: {type: "range", min: 5, max: 50, step: 1},
      description: "Number of bubbles to display",
    },
    minSize: {
      control: {type: "range", min: 10, max: 100, step: 5},
      description: "Minimum bubble size in pixels",
    },
    maxSize: {
      control: {type: "range", min: 100, max: 500, step: 10},
      description: "Maximum bubble size in pixels",
    },
    minOpacity: {
      control: {type: "range", min: 0.1, max: 1, step: 0.05},
      description: "Minimum bubble opacity",
    },
    maxOpacity: {
      control: {type: "range", min: 0.1, max: 1, step: 0.05},
      description: "Maximum bubble opacity",
    },
    minVelocity: {
      control: {type: "range", min: 0.1, max: 5, step: 0.1},
      description: "Minimum bubble velocity (speed of movement)",
    },
    maxVelocity: {
      control: {type: "range", min: 0.1, max: 5, step: 0.1},
      description: "Maximum bubble velocity (speed of movement)",
    },
    colors: {
      control: "array",
      description: "Array of colors for the bubbles",
    },
  },
};

export default meta;

type Story = StoryObj<typeof BubbleBackground>;

// Basic bubble background
export const Default: Story = {
  args: {
    bubbleCount: 20,
    minSize: 20,
    maxSize: 200,
    minOpacity: 0.2,
    maxOpacity: 0.6,
    minVelocity: 0.2,
    maxVelocity: 1,
  },
  render: (args) => (
    <div className='relative h-[600px] w-full'>
      <BubbleBackground {...args} />
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='max-w-md rounded-lg bg-white/80 p-8 shadow-lg backdrop-blur-sm dark:bg-neutral-900/80'>
          <h2 className='mb-4 text-2xl font-semibold'>Bubble Background</h2>
          <p className='mb-4'>This component provides an animated bubble background effect that adds visual interest to your UI.</p>
          <p>You can customize the bubble count, sizes, colors, opacity levels, and animation speed to match your design.</p>
        </div>
      </div>
    </div>
  ),
};

// Colorful bubbles
export const Colorful: Story = {
  args: {
    bubbleCount: 25,
    minSize: 30,
    maxSize: 250,
    minOpacity: 0.2,
    maxOpacity: 0.5,
    minVelocity: 0.2,
    maxVelocity: 0.8,
    colors: ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#9B5DE5"],
  },
  render: (args) => (
    <div className='relative h-[600px] w-full'>
      <BubbleBackground {...args} />
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='max-w-md rounded-lg bg-white/80 p-8 shadow-lg backdrop-blur-sm dark:bg-neutral-900/80'>
          <h2 className='mb-4 text-2xl font-semibold'>Colorful Bubbles</h2>
          <p>Using a custom color palette to create a vibrant, playful background.</p>
        </div>
      </div>
    </div>
  ),
};

// Brand colors
export const BrandColors: Story = {
  args: {
    bubbleCount: 15,
    minSize: 50,
    maxSize: 300,
    minOpacity: 0.1,
    maxOpacity: 0.3,
    minVelocity: 0.1,
    maxVelocity: 0.4,
    colors: ["#3B82F6", "#2563EB", "#1D4ED8", "#1E40AF", "#1E3A8A"],
  },
  render: (args) => (
    <div className='relative h-[600px] w-full'>
      <BubbleBackground {...args} />
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='max-w-md rounded-lg bg-white/90 p-8 shadow-lg backdrop-blur-sm dark:bg-neutral-900/90'>
          <h1 className='mb-2 text-3xl font-bold text-blue-600 dark:text-blue-400'>Company Name</h1>
          <h2 className='mb-4 text-xl'>Brand-aligned Background</h2>
          <p className='mb-4'>Using brand colors for the bubble background creates a cohesive visual identity.</p>
          <button className='rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700'>Learn More</button>
        </div>
      </div>
    </div>
  ),
};

// Fast motion bubbles
export const FastMotion: Story = {
  args: {
    bubbleCount: 30,
    minSize: 10,
    maxSize: 150,
    minOpacity: 0.1,
    maxOpacity: 0.4,
    minVelocity: 1.5,
    maxVelocity: 4,
    colors: ["#F3F4F6", "#E5E7EB", "#D1D5DB", "#9CA3AF"],
  },
  render: (args) => (
    <div className='relative h-[600px] w-full dark:bg-neutral-900'>
      <BubbleBackground {...args} />
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='max-w-md rounded-lg bg-white/80 p-8 shadow-lg backdrop-blur-sm dark:bg-neutral-800/80'>
          <h2 className='mb-4 text-2xl font-semibold'>Fast Motion</h2>
          <p>Increased velocity creates a more dynamic, energetic background effect.</p>
        </div>
      </div>
    </div>
  ),
};

// Large bubbles
export const LargeBubbles: Story = {
  args: {
    bubbleCount: 8,
    minSize: 200,
    maxSize: 500,
    minOpacity: 0.05,
    maxOpacity: 0.2,
    minVelocity: 0.05,
    maxVelocity: 0.2,
  },
  render: (args) => (
    <div className='relative h-[600px] w-full'>
      <BubbleBackground {...args} />
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='max-w-md rounded-lg bg-white/90 p-8 shadow-lg backdrop-blur-sm dark:bg-neutral-900/90'>
          <h2 className='mb-4 text-2xl font-semibold'>Large Bubbles</h2>
          <p>Fewer, larger bubbles create a subtle, modern background effect.</p>
        </div>
      </div>
    </div>
  ),
};

// Hero section with bubble background
export const HeroSection: Story = {
  args: {
    bubbleCount: 20,
    minSize: 50,
    maxSize: 300,
    minOpacity: 0.1,
    maxOpacity: 0.3,
    minVelocity: 0.2,
    maxVelocity: 0.6,
    colors: ["#818CF8", "#6366F1", "#4F46E5", "#4338CA", "#3730A3"],
  },
  render: (args) => (
    <div className='relative h-[600px] w-full bg-gradient-to-br from-indigo-500 to-purple-600'>
      <BubbleBackground {...args} />
      <div className='absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white'>
        <h1 className='mb-6 text-4xl font-bold sm:text-5xl md:text-6xl'>Welcome to Our Platform</h1>
        <p className='mb-8 max-w-2xl text-xl'>Build beautiful interfaces with our component library and background effects.</p>
        <div className='flex flex-wrap justify-center gap-4'>
          <button className='hover:bg-opacity-90 rounded-md bg-white px-6 py-3 font-medium text-indigo-600 transition-colors'>
            Get Started
          </button>
          <button className='rounded-md border-2 border-white bg-transparent px-6 py-3 font-medium text-white transition-colors hover:bg-white/10'>
            Learn More
          </button>
        </div>
      </div>
    </div>
  ),
};
