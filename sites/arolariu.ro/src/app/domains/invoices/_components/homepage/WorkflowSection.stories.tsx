import type {Meta, StoryObj} from "@storybook/react";
import WorkflowSection from "./WorkflowSection";

/**
 * Workflow section showing the 3-step invoice management process:
 * Upload, Review, and Manage. Each step is rendered as a WorkflowCard
 * with a step number badge, icon, description, and CTA link.
 * Uses the `Invoices.Homepage` i18n namespace.
 */
const meta = {
  title: "Invoices/Homepage/WorkflowSection",
  component: WorkflowSection,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof WorkflowSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default 3-step workflow section. */
export const Default: Story = {};

/** Workflow section in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
