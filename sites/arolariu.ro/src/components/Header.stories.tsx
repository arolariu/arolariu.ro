import type {Meta, StoryObj} from "@storybook/react";
import {ClerkProvider} from "@clerk/nextjs";
import {ThemeProvider} from "next-themes";
import Header from "./Header";

/**
 * The Header component renders the site-wide navigation bar with logo,
 * navigation links, auth button, and theme toggle.
 *
 * `Header` nests `AuthButton` and `Navigation` (both Clerk-aware via
 * `useAuth`/`<Show>`), plus `ThemeButton` (`next-themes`). This story relies
 * on the shared, browser-safe Storybook alias for `@clerk/nextjs` so the real
 * `Header` mounts exactly as it does in production, wrapped only in a real
 * `ClerkProvider` and the already-established `next-themes` provider.
 */
const meta = {
  title: "Site/Header",
  component: Header,
  decorators: [
    (Story) => (
      <ClerkProvider>
        <ThemeProvider
          attribute='class'
          defaultTheme='light'
          enableSystem={false}>
          <Story />
        </ThemeProvider>
      </ClerkProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default header at a desktop viewport — shows the full horizontal navigation. */
export const Default: Story = {
  globals: {
    viewport: {value: "lg"},
  },
};

/** Header at a mobile viewport — shows the hamburger navigation trigger instead. */
export const Mobile: Story = {
  globals: {
    viewport: {value: "sm"},
  },
};

/** Header rendered against a dark background via `next-themes`. */
export const Dark: Story = {
  globals: {
    viewport: {value: "lg"},
  },
  decorators: [
    (Story) => (
      <ClerkProvider>
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          enableSystem={false}>
          <div className='dark'>
            <Story />
          </div>
        </ThemeProvider>
      </ClerkProvider>
    ),
  ],
};
