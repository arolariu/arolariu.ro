import type {Meta, StoryObj} from "@storybook/react";
import TechStack from "./TechStack";

/**
 * TechStack section displaying technologies used in the platform.
 * Features tabbed navigation (Frontend, Backend, Cloud, Tooling) with
 * animated technology cards and merged platform statistics with animated
 * counters. Uses the `About.Platform.techStack` and
 * `About.Platform.statistics` i18n namespaces.
 */
const meta = {
  title: "Pages/About/ThePlatform/TechStack",
  component: TechStack,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof TechStack>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default tech stack with tabbed categories and platform statistics. */
export const Default: Story = {};
