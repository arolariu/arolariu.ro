import type {Meta, StoryObj} from "@storybook/react";
import TechSphere from "./TechSphere";

/**
 * TechSphere renders a 3D wireframe icosahedron with floating particles
 * using Three.js (WebGLRenderer, IcosahedronGeometry, PointsMaterial).
 * Pure visual component — no props required.
 *
 * @remarks **WebGL requirement** — This component requires a GPU-accelerated
 * browser context to render. In headless environments (e.g. Playwright, Puppeteer,
 * or CI screenshot runners) the Three.js canvas will appear blank because no
 * WebGL context is available. The story is fully functional in interactive
 * Storybook usage within a standard browser.
 */
const meta = {
  title: "Site/TechSphere",
  component: TechSphere,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "3D wireframe icosahedron with floating particles rendered via Three.js WebGL. " +
          "**Requires a GPU-accelerated browser** — renders blank in headless/CI environments " +
          "(Playwright, Puppeteer) where no WebGL context is available. " +
          "View this story in an interactive browser for the full visual effect.",
      },
    },
  },
} satisfies Meta<typeof TechSphere>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default TechSphere with live Three.js rendering. Requires browser GPU context. */
export const Default: Story = {};
