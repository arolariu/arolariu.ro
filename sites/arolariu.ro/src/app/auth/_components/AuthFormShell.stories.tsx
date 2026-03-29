import type {Meta, StoryObj} from "@storybook/react";
import AuthFormShell from "./AuthFormShell";

/**
 * AuthFormShell provides the outer shell for authentication forms with a
 * kicker text, secondary prompt with link, form slot (children), and footer.
 */
const meta = {
  title: "Pages/Auth/AuthFormShell",
  component: AuthFormShell,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AuthFormShell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sign-up form shell with placeholder content. */
export const SignUp: Story = {
  args: {
    kicker: "Create your account",
    secondaryPrompt: "Already have an account?",
    secondaryAction: "Sign in",
    secondaryHref: "/auth/sign-in",
    footer: "By creating an account, you agree to our Terms of Service and Privacy Policy.",
    children: (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          borderRadius: "0.5rem",
          border: "2px dashed #d1d5db",
          padding: "2rem",
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#6b7280",
        }}>
        [Clerk Sign-Up Form Slot]
      </div>
    ),
  },
};

/** Sign-in form shell with placeholder content. */
export const SignIn: Story = {
  args: {
    kicker: "Welcome back",
    secondaryPrompt: "Don't have an account?",
    secondaryAction: "Sign up",
    secondaryHref: "/auth/sign-up",
    footer: "Secured by Clerk authentication.",
    children: (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          borderRadius: "0.5rem",
          border: "2px dashed #d1d5db",
          padding: "2rem",
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#6b7280",
        }}>
        [Clerk Sign-In Form Slot]
      </div>
    ),
  },
};
