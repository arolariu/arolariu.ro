import type {Meta, StoryObj} from "@storybook/react";
import FeaturesSection from "./FeaturesSection";

/**
 * Features section of the invoices homepage.
 * Displays three feature items (OCR, Analytics, Batch) alongside an
 * invoice illustration. Shows a sign-in prompt for unauthenticated users.
 * Uses the `Invoices.Homepage` i18n namespace.
 */
const meta = {
  title: "arolariu.ro/IMS/Sections/FeaturesSection",
  component: FeaturesSection,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof FeaturesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Authenticated state — no sign-in prompt shown. */
export const Authenticated: Story = {
  args: {
    isAuthenticated: true,
  },
};

/** Unauthenticated state — shows a sign-in prompt below the features. */
export const Unauthenticated: Story = {
  args: {
    isAuthenticated: false,
  },
};

/** Authenticated state in dark mode. */
export const AuthenticatedDark: Story = {
  args: {
    isAuthenticated: true,
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Unauthenticated state in dark mode. */
export const UnauthenticatedDark: Story = {
  args: {
    isAuthenticated: false,
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Authenticated state with mobile viewport. */
export const Mobile: Story = {
  args: {
    isAuthenticated: true,
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
