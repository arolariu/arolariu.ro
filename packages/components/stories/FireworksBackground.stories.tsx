import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FireworksBackground } from "../dist";

const meta: Meta<typeof FireworksBackground> = {
  title: "Design System/Backgrounds/Fireworks Background",
  component: FireworksBackground,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    population: {
      control: { type: "range", min: 0.5, max: 3, step: 0.1 },
      description: "Density of fireworks",
    },
    color: {
      control: "color",
      description: "Optional color override",
    },
    fireworkSpeed: {
      description: "Speed of firework animation",
    },
    fireworkSize: {
      description: "Size of fireworks",
    },
    particleSpeed: {
      description: "Speed of particles",
    },
    particleSize: {
      description: "Size of particles",
    },
  },
};

export default meta;

type Story = StoryObj<typeof FireworksBackground>;

// Basic usage
export const Default: Story = {
  render: () => (
    <div className="w-[600px] h-[400px]">
      <FireworksBackground>
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <h1 className="text-white text-3xl font-bold text-center">
            Fireworks Background
          </h1>
        </div>
      </FireworksBackground>
    </div>
  ),
};

// Customized fireworks
export const CustomDensity: Story = {
  render: () => (
    <div className="w-[600px] h-[400px]">
      <FireworksBackground population={2}>
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <h1 className="text-white text-3xl font-bold text-center">
            Higher Density Fireworks
          </h1>
        </div>
      </FireworksBackground>
    </div>
  ),
};

// Customized with specific colors and size settings
export const CustomProperties: Story = {
  render: () => (
    <div className="w-[600px] h-[400px]">
      <FireworksBackground
        color="#ff4500"
        fireworkSize={{ min: 4, max: 8 }}
        particleSize={{ min: 2, max: 6 }}
        fireworkSpeed={{ min: 5, max: 10 }}
      >
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <h1 className="text-white text-3xl font-bold text-center">
            Custom Fireworks Properties
          </h1>
        </div>
      </FireworksBackground>
    </div>
  ),
};

// With content overlay
export const WithContent: Story = {
  render: () => (
    <div className="w-[600px] h-[400px]">
      <FireworksBackground>
        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-6">
          <div className="bg-white/20 backdrop-blur-md p-6 rounded-xl text-center">
            <h2 className="text-white text-2xl font-bold mb-4">Celebration!</h2>
            <p className="text-white/90 mb-4">
              This component creates a beautiful fireworks effect in the
              background while keeping your content in focus.
            </p>
            <button className="bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-white/90 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </FireworksBackground>
    </div>
  ),
};
