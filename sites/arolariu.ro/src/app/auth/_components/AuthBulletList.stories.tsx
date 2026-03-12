import type {Meta, StoryObj} from "@storybook/react";
import AuthBulletList from "./AuthBulletList";

/**
 * AuthBulletList renders a styled list of bullet points used in the
 * authentication marketing panels. Each bullet is preceded by a decorative dot.
 */
const meta = {
  title: "Pages/Auth/AuthBulletList",
  component: AuthBulletList,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AuthBulletList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default bullet list with three items. */
export const Default: Story = {
  args: {
    bullets: ["Secure authentication with Clerk", "Multi-factor authentication support", "OAuth providers: Google, GitHub"],
  },
};

/** Single bullet item. */
export const SingleBullet: Story = {
  args: {
    bullets: ["Fast and secure sign-in experience"],
  },
};

/** Five bullet items showing longer lists. */
export const ManyBullets: Story = {
  args: {
    bullets: [
      "Create your account in seconds",
      "Access all platform features",
      "AI-powered invoice analysis",
      "Secure data encryption",
      "Multi-device synchronization",
    ],
  },
};

/** Bullet list in dark mode. */
export const DarkMode: Story = {
  args: {
    bullets: ["Secure authentication with Clerk", "Multi-factor authentication support", "OAuth providers: Google, GitHub"],
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
