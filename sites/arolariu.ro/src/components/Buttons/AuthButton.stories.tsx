import type {Meta, StoryObj} from "@storybook/react";

/**
 * The AuthButton adapts to the user's Clerk authentication state.
 *
 * Because Clerk components (`useAuth`, `SignedIn`, `SignedOut`, `UserButton`,
 * `SignInButton`) require a live `ClerkProvider` that is impractical to supply
 * in Storybook, this story focuses on the **loading skeleton** state — the
 * pulsing circle that appears while auth state resolves.
 *
 * The skeleton is the same markup rendered by `AuthButton` when `isLoaded`
 * is `false`.
 */
const meta = {
  title: "Site/Buttons/AuthButton",
  parameters: {
    layout: "centered",
    backgrounds: {default: "light-gray"},
  },
  decorators: [
    (Story) => (
      <div style={{borderRadius: "0.25rem", backgroundColor: "#f3f4f6", padding: "1rem"}}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Loading / skeleton state — a pulsing circle matching the
 * `AuthButton` output before Clerk finishes initialising.
 */
export const Loading: Story = {
  render: () => <div style={{height: "2rem", width: "2rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}} />,
};

/** Multiple skeleton buttons side-by-side (e.g. inside a nav bar). */
export const LoadingInNavBar: Story = {
  render: () => (
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
      <div style={{marginLeft: "auto", height: "2rem", width: "2rem", borderRadius: "9999px", backgroundColor: "#e5e7eb"}} />
    </nav>
  ),
};
