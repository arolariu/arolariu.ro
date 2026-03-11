import type {Meta, StoryObj} from "@storybook/react";
import Hero from "./Hero";

/**
 * Hero section for the Acknowledgements page.
 * Features animated background blobs, a gradient title, subtitle,
 * and a "last updated" timestamp badge.
 * Uses the `Acknowledgements.hero` i18n namespace.
 */
const meta = {
  title: "Pages/Acknowledgements/Hero",
  component: Hero,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Hero>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default hero with a recent last-updated date. */
export const Default: Story = {
  args: {
    lastUpdatedDate: "2025-01-21",
  },
};

/** Hero with an older update date. */
export const OlderDate: Story = {
  args: {
    lastUpdatedDate: "2024-06-15",
  },
};

/** Default hero on mobile viewport. */
export const MobileViewport: Story = {
  args: {
    lastUpdatedDate: "2025-01-21",
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
