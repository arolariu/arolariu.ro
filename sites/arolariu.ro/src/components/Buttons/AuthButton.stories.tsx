import type {Meta, StoryObj} from "@storybook/react";
import {ClerkProvider} from "@clerk/nextjs";
import AuthButton from "./AuthButton";

/**
 * The AuthButton adapts to the user's Clerk authentication state, rendering
 * `<SignInButton>` when signed out or `<UserButton>` when signed in.
 *
 * Clerk is a true external boundary: this story relies on the shared,
 * browser-safe Storybook alias for `@clerk/nextjs` (configured once for the
 * whole preview) so the real `AuthButton` — including its nested `<Show>`,
 * `<SignInButton>`, and `<UserButton>` — can mount exactly as it does in
 * production, wrapped only in a real `ClerkProvider`.
 */
const meta = {
  title: "Site/Buttons/AuthButton",
  component: AuthButton,
  decorators: [
    (Story) => (
      <ClerkProvider>
        <div style={{borderRadius: "0.25rem", backgroundColor: "#f3f4f6", padding: "1rem"}}>
          <Story />
        </div>
      </ClerkProvider>
    ),
  ],
  parameters: {
    layout: "centered",
    backgrounds: {default: "light-gray"},
  },
} satisfies Meta<typeof AuthButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default auth control for the deterministic Clerk state provided by the Storybook alias. */
export const Default: Story = {};

/** Auth control rendered inside a nav-bar-like container, matching its real usage in `Header`. */
export const InNavBar: Story = {
  decorators: [
    (Story) => (
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          borderRadius: "0.5rem",
          border: "1px solid #e5e7eb",
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
          paddingTop: "0.75rem",
          paddingBottom: "0.75rem",
        }}>
        <span style={{fontSize: "0.875rem", fontWeight: "500", color: "#6b7280"}}>Navigation</span>
        <div style={{marginLeft: "auto"}}>
          <Story />
        </div>
      </nav>
    ),
  ],
};
