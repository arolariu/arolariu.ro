import {withAuthState} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import Header from "./Header";

/**
 * Header is the site-wide navigation bar with branding, navigation, auth, and
 * theme controls. It depends on Clerk (via Navigation/AuthButton), which is
 * served by the Storybook Clerk mock. Mounts the real component.
 */
const meta = {
  title: "arolariu.ro/Site/Header",
  component: Header,
  parameters: {layout: "fullscreen"},
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Header rendered for a signed-in user. */
export const SignedIn: Story = {decorators: [withAuthState(false)]};

/** Header rendered for a signed-out user. */
export const SignedOut: Story = {decorators: [withAuthState(true)]};
