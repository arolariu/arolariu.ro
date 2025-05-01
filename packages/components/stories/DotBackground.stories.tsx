import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DotBackground } from "../dist";

const meta: Meta<typeof DotBackground> = {
  title: "Design System/Backgrounds/Dot Background",
  component: DotBackground,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof DotBackground>;

// Create a wrapper component for our dot background examples
const BackgroundWrapper = ({ children, className = "", height = "400px" }) => (
  <div className={`relative ${className}`} style={{ height }}>
    {children}
  </div>
);

// Basic example
export const Basic: Story = {
  render: () => (
    <BackgroundWrapper>
      <DotBackground />
    </BackgroundWrapper>
  ),
};

// With glowing effect
export const WithGlowingDots: Story = {
  render: () => (
    <BackgroundWrapper>
      <DotBackground glow={true} />
    </BackgroundWrapper>
  ),
};

// Custom spacing
export const CustomSpacing: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <BackgroundWrapper
        className="border rounded-lg overflow-hidden"
        height="200px"
      >
        <DotBackground width={8} height={8} />
        <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
          Dense (8x8)
        </div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className="border rounded-lg overflow-hidden"
        height="200px"
      >
        <DotBackground width={16} height={16} />
        <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
          Default (16x16)
        </div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className="border rounded-lg overflow-hidden"
        height="200px"
      >
        <DotBackground width={32} height={16} />
        <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
          Wide (32x16)
        </div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className="border rounded-lg overflow-hidden"
        height="200px"
      >
        <DotBackground width={40} height={40} />
        <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
          Sparse (40x40)
        </div>
      </BackgroundWrapper>
    </div>
  ),
};

// Custom dot radius
export const CustomDotRadius: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      <BackgroundWrapper
        className="border rounded-lg overflow-hidden"
        height="200px"
      >
        <DotBackground cr={0.5} />
        <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
          Small dots (0.5)
        </div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className="border rounded-lg overflow-hidden"
        height="200px"
      >
        <DotBackground cr={1} />
        <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
          Default dots (1)
        </div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className="border rounded-lg overflow-hidden"
        height="200px"
      >
        <DotBackground cr={2} />
        <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
          Large dots (2)
        </div>
      </BackgroundWrapper>
    </div>
  ),
};

// Different colors
export const DifferentColors: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <BackgroundWrapper
        className="border rounded-lg overflow-hidden bg-neutral-950"
        height="200px"
      >
        <DotBackground className="text-white/25" />
        <div className="absolute bottom-2 left-2 bg-neutral-900/80 px-2 py-1 rounded text-xs text-white">
          White dots on dark
        </div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className="border rounded-lg overflow-hidden bg-white"
        height="200px"
      >
        <DotBackground className="text-neutral-900/20" />
        <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
          Dark dots on light
        </div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className="border rounded-lg overflow-hidden bg-blue-950"
        height="200px"
      >
        <DotBackground className="text-blue-300/30" glow={true} />
        <div className="absolute bottom-2 left-2 bg-blue-900/80 px-2 py-1 rounded text-xs text-white">
          Blue glowing dots
        </div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className="border rounded-lg overflow-hidden bg-emerald-950"
        height="200px"
      >
        <DotBackground className="text-emerald-300/30" glow={true} />
        <div className="absolute bottom-2 left-2 bg-emerald-900/80 px-2 py-1 rounded text-xs text-white">
          Green glowing dots
        </div>
      </BackgroundWrapper>
    </div>
  ),
};

// With offset
export const WithOffset: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <BackgroundWrapper
        className="border rounded-lg overflow-hidden"
        height="200px"
      >
        <DotBackground x={5} y={5} />
        <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
          Pattern offset (x:5, y:5)
        </div>
      </BackgroundWrapper>

      <BackgroundWrapper
        className="border rounded-lg overflow-hidden"
        height="200px"
      >
        <DotBackground cx={2} cy={2} />
        <div className="absolute bottom-2 left-2 bg-background/80 px-2 py-1 rounded text-xs">
          Dot position offset (cx:2, cy:2)
        </div>
      </BackgroundWrapper>
    </div>
  ),
};

// Interactive showcase with content
export const WithContent: Story = {
  render: () => (
    <div className="p-4">
      <div
        className="relative border rounded-xl overflow-hidden shadow-lg"
        style={{ height: "400px" }}
      >
        <DotBackground
          className="text-primary/20"
          width={24}
          height={24}
          glow={true}
        />

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-background/80 backdrop-blur-sm p-6 rounded-xl shadow-lg max-w-md text-center">
            <h3 className="text-2xl font-bold mb-2">Feature Showcase</h3>
            <p className="text-muted-foreground mb-4">
              This dot background creates a subtle, interactive pattern that
              works beautifully as a backdrop for content. Perfect for hero
              sections, cards, and feature showcases.
            </p>
            <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
};

// Full page background
export const FullPageBackground: Story = {
  render: () => (
    <div className="h-screen w-screen p-0 m-0">
      <div className="relative w-full h-full">
        <DotBackground
          className="text-neutral-300/20"
          width={32}
          height={32}
          cr={1.2}
          glow={true}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-center">
            Welcome to Our Platform
          </h1>
          <p className="text-xl text-muted-foreground mb-8 text-center max-w-2xl">
            A beautiful, responsive web application with an elegant dot
            background pattern
          </p>
          <div className="flex gap-4">
            <button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md">
              Get Started
            </button>
            <button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6 py-3 rounded-md">
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
};
