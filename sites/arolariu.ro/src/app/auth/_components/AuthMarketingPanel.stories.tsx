import type {Meta, StoryObj} from "@storybook/react";
import AuthMarketingPanel from "./AuthMarketingPanel";

/**
 * AuthMarketingPanel displays a marketing/branding panel on the auth pages
 * with animated entrance effects, an illustration image, bullet points, and
 * optional trust badges.
 */
const meta = {
  title: "Pages/Auth/AuthMarketingPanel",
  component: AuthMarketingPanel,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AuthMarketingPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sign-up marketing panel with trust badges. */
export const SignUpPanel: Story = {
  args: {
    title: "Join arolariu.ro",
    subtitle: "Create your account and start managing your invoices with AI-powered analysis.",
    illustrationSrc: "https://dummyimage.com/320x320/4f46e5/ffffff&text=Sign+Up",
    illustrationAlt: "Sign up illustration",
    bullets: ["AI-powered invoice scanning", "Smart expense categorization", "Recipe suggestions from groceries"] as const,
    trustBadges: ["256-bit SSL", "GDPR Compliant", "SOC 2"],
  },
};

/** Sign-in marketing panel without trust badges. */
export const SignInPanel: Story = {
  args: {
    title: "Welcome Back",
    subtitle: "Sign in to access your invoices and financial insights.",
    illustrationSrc: "https://dummyimage.com/320x320/059669/ffffff&text=Sign+In",
    illustrationAlt: "Sign in illustration",
    bullets: ["Quick secure access", "Multi-factor authentication", "Cross-device synchronization"] as const,
  },
};

/** Panel with all features showcased. */
export const FullFeatured: Story = {
  args: {
    title: "Discover arolariu.ro",
    subtitle: "A modern platform for invoice management, AI analysis, and personal finance tracking.",
    illustrationSrc: "https://dummyimage.com/320x320/7c3aed/ffffff&text=Platform",
    illustrationAlt: "Platform illustration",
    bullets: ["Upload & analyze receipts", "Track spending patterns", "Generate meal plans from purchases"] as const,
    trustBadges: ["Open Source", "Enterprise Ready", "Privacy First", "AI Powered"],
  },
};
