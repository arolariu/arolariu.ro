import type {Meta, StoryObj} from "@storybook/react";
import TechSphere from "./TechSphere";

/**
 * TechSphere renders a 3D wireframe icosahedron with floating particles
 * using Three.js (WebGLRenderer, IcosahedronGeometry, PointsMaterial).
 * Pure visual component — no props required.
 */
const meta = {
  title: "Site/TechSphere",
  component: TechSphere,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof TechSphere>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default TechSphere with live Three.js rendering. */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
