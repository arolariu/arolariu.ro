import type {Meta, StoryObj} from "@storybook/react";
import WorkflowSection from "./WorkflowSection";

/**
 * Workflow section showing the 3-step invoice management process:
 * Upload, Review, and Manage. Each step is rendered as a WorkflowCard
 * with a step number badge, icon, description, and CTA link.
 * Uses the `Invoices.Homepage` i18n namespace.
 */
const meta = {
  title: "arolariu.ro/IMS/Sections/WorkflowSection",
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

/** Workflow section with mobile viewport. */
export const Mobile: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};

/** Workflow section with tablet viewport. */
export const Tablet: Story = {
  parameters: {
    viewport: {defaultViewport: "tablet"},
  },
};
