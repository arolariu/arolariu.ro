import type {Meta, StoryObj} from "@storybook/react";
import HeroSection from "./HeroSection";

/**
 * Hero section for the invoices homepage.
 * Displays a heading with highlight text, description, CTA buttons,
 * and an invoice illustration. Adapts based on authentication state:
 * shows a "View My Invoices" button when authenticated.
 * Uses the `Invoices.Homepage` i18n namespace.
 */
const meta = {
  title: "Invoices/Homepage/HeroSection",
  component: HeroSection,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof HeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Authenticated state — shows both "Get Started" and "View My Invoices" buttons. */
export const Authenticated: Story = {
  args: {
    isAuthenticated: true,
  },
};

/** Unauthenticated state — shows only the "Get Started" button. */
export const Unauthenticated: Story = {
  args: {
    isAuthenticated: false,
  },
};

/** Authenticated state on a mobile viewport. */
export const AuthenticatedMobile: Story = {
  args: {
    isAuthenticated: true,
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};

/** Unauthenticated state on a mobile viewport. */
export const UnauthenticatedMobile: Story = {
  args: {
    isAuthenticated: false,
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
