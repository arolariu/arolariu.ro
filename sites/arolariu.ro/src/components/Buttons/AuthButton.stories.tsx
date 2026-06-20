import {withAuthState} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import AuthButton from "./AuthButton";

/**
 * AuthButton shows a Clerk sign-in button when signed out and a user avatar
 * button when signed in. Served by the Storybook Clerk mock. Mounts the real component.
 */
const meta = {
  title: "arolariu.ro/Site/Buttons/AuthButton",
  component: AuthButton,
  parameters: {layout: "centered"},
} satisfies Meta<typeof AuthButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Signed-in state — renders the user button. */
export const SignedIn: Story = {decorators: [withAuthState(false)]};

/** Signed-out state — renders the sign-in button. */
export const SignedOut: Story = {decorators: [withAuthState(true)]};
