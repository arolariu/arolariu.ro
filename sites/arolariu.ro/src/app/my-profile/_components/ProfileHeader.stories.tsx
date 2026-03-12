import type {Meta, StoryObj} from "@storybook/react";
import {ProfileHeader} from "./ProfileHeader";

/** Creates a minimal Clerk User mock matching the fields ProfileHeader actually reads. */
function createMockClerkUser(overrides: Record<string, unknown> = {}): unknown {
  return {
    id: "user_mock_123",
    firstName: "Alexandru",
    lastName: "Olariu",
    fullName: "Alexandru Olariu",
    username: "arolariu",
    imageUrl: "https://i.pravatar.cc/128",
    emailAddresses: [{emailAddress: "admin@arolariu.ro"}],
    primaryEmailAddress: {emailAddress: "admin@arolariu.ro"},
    createdAt: new Date("2024-01-15"),
    lastSignInAt: new Date("2026-03-11"),
    ...overrides,
  };
}

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
    user: createMockClerkUser({
      id: "user_2abc123",
      imageUrl: "https://i.pravatar.cc/96",
      createdAt: new Date("2023-01-15"),
    }),
    userIdentifier: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  },
};

/** Profile header with a realistic avatar image. */
export const WithAvatar: Story = {
  args: {
    user: createMockClerkUser({
      id: "user_avatar1",
      firstName: "Maria",
      lastName: "Popescu",
      fullName: "Maria Popescu",
      username: "mariap",
      emailAddresses: [{emailAddress: "maria.popescu@example.com"}],
      primaryEmailAddress: {emailAddress: "maria.popescu@example.com"},
      createdAt: new Date("2024-06-01"),
    }),
    userIdentifier: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  },
};

/** Profile header with a very long name to test text overflow and wrapping. */
export const LongName: Story = {
  args: {
    user: createMockClerkUser({
      id: "user_longname",
      firstName: "Alexandrescu-Constantinescu",
      lastName: "Von Hohenzollern-Sigmaringen",
      fullName: "Alexandrescu-Constantinescu Von Hohenzollern-Sigmaringen",
      username: "alexandrescu",
      imageUrl: "https://i.pravatar.cc/128?u=longname",
      emailAddresses: [{emailAddress: "alexandrescu.von.hohenzollern-sigmaringen@very-long-domain-name.example.com"}],
      primaryEmailAddress: {emailAddress: "alexandrescu.von.hohenzollern-sigmaringen@very-long-domain-name.example.com"},
      createdAt: new Date("2020-03-10"),
    }),
    userIdentifier: "c3d4e5f6-a7b8-9012-cdef-123456789012",
  },
};

/** Profile header for a brand new user — just created, no sign-in history. */
export const NewUser: Story = {
  args: {
    user: createMockClerkUser({
      id: "user_new",
      firstName: "New",
      lastName: "User",
      fullName: "New User",
      username: "newuser",
      imageUrl: "https://i.pravatar.cc/128?u=new",
      emailAddresses: [{emailAddress: "new.user@example.com"}],
      primaryEmailAddress: {emailAddress: "new.user@example.com"},
      createdAt: new Date(),
      lastSignInAt: null,
    }),
    userIdentifier: "d4e5f6a7-b8c9-0123-def0-234567890123",
  },
};
