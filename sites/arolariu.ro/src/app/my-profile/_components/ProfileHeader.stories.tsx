import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../messages/en.json";
import {ProfileHeader} from "./ProfileHeader";

/**
 * Profile header displaying the user's avatar, name, email, badges
 * (Premium, Member Since, User ID, Days Active), an edit profile sheet,
 * and a profile completion progress bar.
 * Uses the `Profile` i18n namespace and accepts a Clerk `User` object.
 */
const meta = {
  title: "Pages/Profile/ProfileHeader",
  component: ProfileHeader,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ProfileHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Profile header with no user data — shows fallback state. */
export const NoUser: Story = {
  args: {
    user: null,
    userIdentifier: "00000000-0000-0000-0000-000000000000",
  },
};

/** Profile header with mock user data. */
export const WithUser: Story = {
  args: {
    user: {
      id: "user_2abc123",
      firstName: "Alexandru",
      lastName: "Olariu",
      imageUrl: "https://via.placeholder.com/96",
      primaryEmailAddress: {emailAddress: "admin@arolariu.ro"},
      createdAt: new Date("2023-01-15").getTime(),
    } as never,
    userIdentifier: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  },
};
