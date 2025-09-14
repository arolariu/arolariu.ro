import type {Meta, StoryObj} from "@storybook/react";
import {DotBackground} from "../dist";

const meta: Meta<typeof DotBackground> = {
  title: "Design System/Backgrounds/Dot Background",
  component: DotBackground,
  tags: ["autodocs"], // Enable autodocs for this story
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `
**Dot Background Component**

A custom component that generates a repeating dot pattern background using SVG. Ideal for creating subtle, grid-like visual textures.

**Core Component:**
*   \`<DotBackground>\`: The main component that renders an SVG element containing the dot pattern.

**Key Features & Props:**
*   **Pattern Definition**: Uses an SVG \`<pattern>\` element to define a single cell of the grid containing a dot (\`<circle>\`).
*   **Customization**:
    *   \`width\`, \`height\`: Control the spacing of the grid (size of the pattern cell).
    *   \`cr\`: Defines the radius of the dots.
    *   \`cx\`, \`cy\`: Offset the dot's position within its grid cell.
    *   \`x\`, \`y\`: Offset the entire pattern's starting position.
*   **Styling**:
    *   \`className\`: Applies CSS classes to the root \`<svg>\` element. Crucial for setting the dot color (e.g., \`text-neutral-300/20\`) and potentially opacity or filters.
    *   \`glow\`: If true, applies a CSS \`filter: drop-shadow(...)\` to create a glowing effect around the dots (color inherited from text color).
*   **Rendering**: Renders an \`<svg>\` element positioned absolutely to fill its parent container, with a \`<rect>\` element that fills the SVG area using the defined pattern (\`fill="url(#pattern-dots)"\`).

**Technical Details:**
*   The SVG \`patternUnits\` is set to \`userSpaceOnUse\`, meaning the \`width\` and \`height\` props define the pattern size in pixels.
*   The component is designed to be placed inside a container with \`position: relative\` or \`absolute\` for proper layering.
        `,
      },
    },
  },
  argTypes: {
    width: {
      control: "number",
      description: "The horizontal spacing between dots.",
      table: {
        defaultValue: {summary: 16},
      },
    },
    height: {
      control: "number",
      description: "The vertical spacing between dots.",
      table: {
        defaultValue: {summary: 16},
      },
    },
    cr: {
      control: "number",
      description: "The radius of each dot.",
      table: {
        defaultValue: {summary: 1},
      },
    },
    cx: {
      control: "number",
      description: "Horizontal offset of the dot within its grid cell.",
      table: {
        defaultValue: {summary: 0},
      },
    },
    cy: {
      control: "number",
      description: "Vertical offset of the dot within its grid cell.",
      table: {
        defaultValue: {summary: 0},
      },
    },
    x: {
      control: "number",
      description: "Horizontal offset of the entire pattern.",
      table: {
        defaultValue: {summary: 0},
      },
    },
    y: {
      control: "number",
      description: "Vertical offset of the entire pattern.",
      table: {
        defaultValue: {summary: 0},
      },
    },
    glow: {
      control: "boolean",
      description: "Adds a glowing effect to the dots using a CSS filter.",
      table: {
        defaultValue: {summary: false},
      },
    },
    className: {
      control: "text",
      description: "CSS class name for the SVG element (useful for setting color, e.g., `text-neutral-300/20`).",
    },
  },
};

export default meta;

type Story = StoryObj<typeof DotBackground>;

// Create a wrapper component for our dot background examples
const BackgroundWrapper = ({children, className = "", height = "400px"}) => (
  <div
    className={`relative ${className}`}
    style={{height}}>
    {children}
  </div>
);

// Basic example
export const Basic: Story = {
  parameters: {
    docs: {
      description: {
        story: "Displays the default dot background pattern.",
      },
    },
  },
  render: () => (
    <BackgroundWrapper>
      <DotBackground />
    </BackgroundWrapper>
  ),
};

// With glowing effect
export const WithGlowingDots: Story = {
  args: {
    glow: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Applies a glow effect to the dots using the `glow` prop.",
      },
    },
  },
  render: (args) => (
    <BackgroundWrapper>
      <DotBackground {...args} />
    </BackgroundWrapper>
  ),
};

// Custom spacing
export const CustomSpacing: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates different dot densities by adjusting the `width` and `height` props.",
      },
    },
  },
  render: () => (
    <div className='grid grid-cols-1 gap-4 p-4 md:grid-cols-2'>
      <BackgroundWrapper
        className='overflow-hidden rounded-lg border'
        height='200px'>
        <DotBackground
          width={8}
          height={8}
        />
        <div className='bg-background/80 absolute bottom-2 left-2 rounded px-2 py-1 text-xs'>Dense (8x8)</div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className='overflow-hidden rounded-lg border'
        height='200px'>
        <DotBackground
          width={16}
          height={16}
        />
        <div className='bg-background/80 absolute bottom-2 left-2 rounded px-2 py-1 text-xs'>Default (16x16)</div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className='overflow-hidden rounded-lg border'
        height='200px'>
        <DotBackground
          width={32}
          height={16}
        />
        <div className='bg-background/80 absolute bottom-2 left-2 rounded px-2 py-1 text-xs'>Wide (32x16)</div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className='overflow-hidden rounded-lg border'
        height='200px'>
        <DotBackground
          width={40}
          height={40}
        />
        <div className='bg-background/80 absolute bottom-2 left-2 rounded px-2 py-1 text-xs'>Sparse (40x40)</div>
      </BackgroundWrapper>
    </div>
  ),
};

// Custom dot radius
export const CustomDotRadius: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows how changing the `cr` (circle radius) prop affects the size of the dots.",
      },
    },
  },
  render: () => (
    <div className='grid grid-cols-1 gap-4 p-4 md:grid-cols-3'>
      <BackgroundWrapper
        className='overflow-hidden rounded-lg border'
        height='200px'>
        <DotBackground cr={0.5} />
        <div className='bg-background/80 absolute bottom-2 left-2 rounded px-2 py-1 text-xs'>Small dots (0.5)</div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className='overflow-hidden rounded-lg border'
        height='200px'>
        <DotBackground cr={1} />
        <div className='bg-background/80 absolute bottom-2 left-2 rounded px-2 py-1 text-xs'>Default dots (1)</div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className='overflow-hidden rounded-lg border'
        height='200px'>
        <DotBackground cr={2} />
        <div className='bg-background/80 absolute bottom-2 left-2 rounded px-2 py-1 text-xs'>Large dots (2)</div>
      </BackgroundWrapper>
    </div>
  ),
};

// Different colors
export const DifferentColors: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Illustrates setting the dot color using the `className` prop (e.g., Tailwind text color utilities) on different background colors.",
      },
    },
  },
  render: () => (
    <div className='grid grid-cols-1 gap-4 p-4 md:grid-cols-2'>
      <BackgroundWrapper
        className='overflow-hidden rounded-lg border bg-neutral-950'
        height='200px'>
        <DotBackground className='text-white/25' />
        <div className='absolute bottom-2 left-2 rounded bg-neutral-900/80 px-2 py-1 text-xs text-white'>White dots on dark</div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className='overflow-hidden rounded-lg border bg-white'
        height='200px'>
        <DotBackground className='text-neutral-900/20' />
        <div className='bg-background/80 absolute bottom-2 left-2 rounded px-2 py-1 text-xs'>Dark dots on light</div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className='overflow-hidden rounded-lg border bg-blue-950'
        height='200px'>
        <DotBackground
          className='text-blue-300/30'
          glow={true}
        />
        <div className='absolute bottom-2 left-2 rounded bg-blue-900/80 px-2 py-1 text-xs text-white'>Blue glowing dots</div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className='overflow-hidden rounded-lg border bg-emerald-950'
        height='200px'>
        <DotBackground
          className='text-emerald-300/30'
          glow={true}
        />
        <div className='absolute bottom-2 left-2 rounded bg-emerald-900/80 px-2 py-1 text-xs text-white'>Green glowing dots</div>
      </BackgroundWrapper>
    </div>
  ),
};

// With offset
export const WithOffset: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows the effect of offsetting the entire pattern (`x`, `y`) or the position of dots within their cells (`cx`, `cy`).",
      },
    },
  },
  render: () => (
    <div className='grid grid-cols-1 gap-4 p-4 md:grid-cols-2'>
      <BackgroundWrapper
        className='overflow-hidden rounded-lg border'
        height='200px'>
        <DotBackground
          x={5}
          y={5}
        />
        <div className='bg-background/80 absolute bottom-2 left-2 rounded px-2 py-1 text-xs'>Pattern offset (x:5, y:5)</div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className='overflow-hidden rounded-lg border'
        height='200px'>
        <DotBackground
          cx={2}
          cy={2}
        />
        <div className='bg-background/80 absolute bottom-2 left-2 rounded px-2 py-1 text-xs'>Dot position offset (cx:2, cy:2)</div>
      </BackgroundWrapper>
    </div>
  ),
};

// Interactive showcase with content
export const WithContent: Story = {
  parameters: {
    docs: {
      description: {
        story: "Demonstrates using the dot background as a backdrop for foreground content, combining several customization props.",
      },
    },
  },
  render: () => (
    <div className='p-4'>
      <div
        className='relative overflow-hidden rounded-xl border shadow-lg'
        style={{height: "400px"}}>
        <DotBackground
          className='text-primary/20'
          width={24}
          height={24}
          glow={true}
        />

        <div className='absolute inset-0 flex items-center justify-center'>
          <div className='bg-background/80 max-w-md rounded-xl p-6 text-center shadow-lg backdrop-blur-sm'>
            <h3 className='mb-2 text-2xl font-bold'>Feature Showcase</h3>
            <p className='text-muted-foreground mb-4'>
              This dot background creates a subtle, interactive pattern that works beautifully as a backdrop for content. Perfect for hero
              sections, cards, and feature showcases.
            </p>
            <button className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2'>Learn More</button>
          </div>
        </div>
      </div>
    </div>
  ),
};

// Full page background
export const FullPageBackground: Story = {
  parameters: {
    docs: {
      description: {
        story: "Shows how the component can be used to cover the entire viewport as a page background.",
      },
    },
  },
  render: () => (
    <div className='m-0 h-screen w-screen p-0'>
      <div className='relative h-full w-full'>
        <DotBackground
          className='text-neutral-300/20'
          width={32}
          height={32}
          cr={1.2}
          glow={true}
        />
        <div className='absolute inset-0 flex flex-col items-center justify-center p-4'>
          <h1 className='mb-4 text-center text-4xl font-bold md:text-6xl'>Welcome to Our Platform</h1>
          <p className='text-muted-foreground mb-8 max-w-2xl text-center text-xl'>
            A beautiful, responsive web application with an elegant dot background pattern
          </p>
          <div className='flex gap-4'>
            <button className='bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-3'>Get Started</button>
            <button className='bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-md px-6 py-3'>Learn More</button>
          </div>
        </div>
      </div>
    </div>
  ),
};
