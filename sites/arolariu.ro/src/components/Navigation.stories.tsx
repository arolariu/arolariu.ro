import type {Meta, StoryObj} from "@storybook/react";
import {ClerkProvider} from "@clerk/nextjs";
import {ThemeProvider} from "next-themes";
import {userEvent, within} from "storybook/test";
import {DesktopNavigation, MobileNavigation} from "./Navigation";

/**
 * The Navigation module exports `DesktopNavigation` (horizontal menu) and
 * `MobileNavigation` (hamburger trigger + slide-in panel). Both read
 * `useAuth` from Clerk to conditionally show "My Profile", so this story
 * relies on the shared, browser-safe Storybook alias for `@clerk/nextjs` to
 * mount the real components wrapped only in a real `ClerkProvider`.
 */
const meta = {
  title: "Site/Navigation",
  component: DesktopNavigation,
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
    layout: "centered",
  },
} satisfies Meta<typeof DesktopNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Real desktop navigation menu with dropdown columns. */
export const Desktop: Story = {};

/** Real mobile navigation trigger — closed by default, matching production's initial state. */
export const MobileClosed: Story = {
  render: () => <MobileNavigation />,
};

/** Mobile navigation panel opened via the real hamburger toggle button. */
export const MobileOpened: Story = {
  render: () => <MobileNavigation />,
  play: async ({canvasElement}) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByRole("button", {expanded: false});
    await userEvent.click(toggle);
  },
};
