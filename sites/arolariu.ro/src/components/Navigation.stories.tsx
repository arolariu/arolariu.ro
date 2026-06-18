import {withAuthState} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import {DesktopNavigation, MobileNavigation} from "./Navigation";

/**
 * Navigation renders the site menu. The visible entries depend on Clerk auth
 * state (`useAuth`), served by the Storybook Clerk mock. Mounts the real components.
 */
const meta = {
  title: "arolariu.ro/Site/Navigation",
  component: DesktopNavigation,
  parameters: {layout: "fullscreen"},
} satisfies Meta<typeof DesktopNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Desktop navigation for a signed-in user (includes authenticated entries). */
export const DesktopSignedIn: Story = {
  decorators: [withAuthState(false)],
  render: () => <DesktopNavigation />,
};

/** Desktop navigation for a signed-out user. */
export const DesktopSignedOut: Story = {
  decorators: [withAuthState(true)],
  render: () => <DesktopNavigation />,
};

/** Mobile navigation (hamburger menu) for a signed-in user. */
export const Mobile: Story = {
  decorators: [withAuthState(false)],
  render: () => <MobileNavigation />,
};
