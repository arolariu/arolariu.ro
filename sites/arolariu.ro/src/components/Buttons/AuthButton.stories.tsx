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
  decorators: [(Story) => <div className='rounded bg-gray-100 p-4 dark:bg-gray-800'><Story /></div>],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Loading / skeleton state — a pulsing circle matching the
 * `AuthButton` output before Clerk finishes initialising.
 */
export const Loading: Story = {
  render: () => <div className='h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />,
};

/** Multiple skeleton buttons side-by-side (e.g. inside a nav bar). */
export const LoadingInNavBar: Story = {
  render: () => (
    <nav className='flex items-center gap-4 rounded-lg border border-gray-200 px-6 py-3 dark:border-gray-700'>
      <span className='text-sm font-medium text-gray-500 dark:text-gray-400'>Navigation</span>
      <div className='ml-auto h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700' />
    </nav>
  ),
};
