import type {Meta, StoryObj} from "@storybook/react";
import AuthFormShell from "./AuthFormShell";

/**
 * AuthFormShell provides the outer shell for authentication forms with a
 * kicker text, secondary prompt with link, form slot (children), and footer.
 */
const meta = {
  title: "Auth/AuthFormShell",
  component: AuthFormShell,
  tags: ["autodocs"],
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
      <div className="space-y-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
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
      <div className="space-y-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
        [Clerk Sign-In Form Slot]
      </div>
    ),
  },
};
