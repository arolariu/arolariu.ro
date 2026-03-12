import type {Meta, StoryObj} from "@storybook/react";
import LicenseBreakdown from "./LicenseBreakdown";

/**
 * License distribution visualization showing MIT vs Apache breakdown.
 * Renders two animated license cards with progress bars and
 * percentage labels inside a section wrapper.
 * Uses the `Acknowledgements.licenses` i18n namespace.
 */
const meta = {
  title: "Pages/Acknowledgements/LicenseBreakdown",
  component: LicenseBreakdown,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof LicenseBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default license breakdown with MIT and Apache cards. */
export const Default: Story = {};

/** Dark mode variant. */
export const DarkMode: Story = {
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};

/** Tablet (iPad) viewport variant. */
export const TabletViewport: Story = {
  parameters: {
    viewport: {defaultViewport: "ipad"},
  },
};
