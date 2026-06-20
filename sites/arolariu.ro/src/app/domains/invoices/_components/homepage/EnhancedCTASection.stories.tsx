import type {Meta, StoryObj} from "@storybook/react";
import EnhancedCTASection from "./EnhancedCTASection";

/**
 * Enhanced call-to-action section for the invoices homepage.
 * Features animated gradient orbs, sparkle icon, CTA buttons,
 * and trust badges (Secure, Cloud, AI).
 * Uses the `Invoices.Homepage` i18n namespace.
 */
const meta = {
  title: "arolariu.ro/IMS/Sections/EnhancedCTASection",
  component: EnhancedCTASection,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof EnhancedCTASection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default CTA section with action buttons and trust badges. */
export const Default: Story = {};

/** CTA section in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** CTA section with mobile viewport. */
export const Mobile: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};

/** CTA section with tablet viewport. */
export const Tablet: Story = {
  parameters: {
    viewport: {defaultViewport: "tablet"},
  },
};
