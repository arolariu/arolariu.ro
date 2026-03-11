import type {Meta, StoryObj} from "@storybook/react";
import AuthTrustBadgesRow from "./AuthTrustBadgesRow";

/**
 * AuthTrustBadgesRow renders a row of secondary badges used to build trust
 * on authentication pages (e.g., "256-bit SSL", "GDPR Compliant").
 */
const meta = {
  title: "Auth/AuthTrustBadgesRow",
  component: AuthTrustBadgesRow,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AuthTrustBadgesRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default trust badges row with three badges. */
export const Default: Story = {
  args: {
    badges: ["256-bit SSL", "GDPR Compliant", "SOC 2"],
  },
};

/** Single badge. */
export const SingleBadge: Story = {
  args: {
    badges: ["Enterprise Ready"],
  },
};

/** Many badges showing wrap behavior. */
export const ManyBadges: Story = {
  args: {
    badges: ["Open Source", "Privacy First", "AI Powered", "Enterprise Ready", "Multi-language", "24/7 Support"],
  },
};
