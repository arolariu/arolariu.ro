import type {Meta, StoryObj} from "@storybook/react";
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

/** Profile header with a realistic avatar image. */
export const WithAvatar: Story = {
  args: {
    user: {
      id: "user_avatar1",
      firstName: "Maria",
      lastName: "Popescu",
      imageUrl: "https://i.pravatar.cc/128",
      primaryEmailAddress: {emailAddress: "maria.popescu@example.com"},
      createdAt: new Date("2024-06-01").getTime(),
    } as never,
    userIdentifier: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  },
};

/** Profile header with a very long name to test text overflow and wrapping. */
export const LongName: Story = {
  args: {
    user: {
      id: "user_longname",
      firstName: "Alexandrescu-Constantinescu",
      lastName: "Von Hohenzollern-Sigmaringen",
      imageUrl: "https://i.pravatar.cc/128?u=longname",
      primaryEmailAddress: {emailAddress: "alexandrescu.von.hohenzollern-sigmaringen@very-long-domain-name.example.com"},
      createdAt: new Date("2020-03-10").getTime(),
    } as never,
    userIdentifier: "c3d4e5f6-a7b8-9012-cdef-123456789012",
  },
};

/** Profile header at mobile viewport width. */
export const MobileViewport: Story = {
  args: {
    user: {
      id: "user_mobile",
      firstName: "Alexandru",
      lastName: "Olariu",
      imageUrl: "https://i.pravatar.cc/128?u=mobile",
      primaryEmailAddress: {emailAddress: "admin@arolariu.ro"},
      createdAt: new Date("2023-01-15").getTime(),
    } as never,
    userIdentifier: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};

/** Profile header in dark mode. */
export const DarkMode: Story = {
  args: {
    user: {
      id: "user_dark",
      firstName: "Alexandru",
      lastName: "Olariu",
      imageUrl: "https://i.pravatar.cc/128?u=dark",
      primaryEmailAddress: {emailAddress: "admin@arolariu.ro"},
      createdAt: new Date("2023-01-15").getTime(),
    } as never,
    userIdentifier: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
