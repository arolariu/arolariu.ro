import type {Meta, StoryObj} from "@storybook/react";
import BentoSection from "./BentoSection";

/**
 * Bento grid section displaying platform capabilities:
 * AI, Analytics, Cloud, OCR, Security, and Sharing.
 * Features animated gradient cards with shimmer overlays and particles.
 * Uses the `Invoices.Homepage` i18n namespace.
 */
const meta = {
  title: "Invoices/Homepage/BentoSection",
  component: BentoSection,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof BentoSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default bento grid with six capability cards. */
export const Default: Story = {};

/** Bento section in dark mode. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
