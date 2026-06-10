"use client";

import {usePaginationWithSearch} from "../../../../../hooks/usePagination";

const storybookUserInformation = {
  user: {
    id: "user_storybook",
    firstName: "Story",
    lastName: "User",
    fullName: "Story User",
    username: "story.user",
    imageUrl: "",
    primaryEmailAddress: {emailAddress: "story.user@example.com"},
    emailAddresses: [{emailAddress: "story.user@example.com"}],
  },
  userIdentifier: "user_storybook",
  userJwt: "storybook-token",
};

/**
 * Storybook-safe current-user hook that never calls `/api/user`.
 *
 * @returns Stable authenticated user information for isolated stories.
 */
export function useUserInformation(): Readonly<{
  userInformation: typeof storybookUserInformation;
  isLoading: boolean;
  isError: boolean;
}> {
  return {
    userInformation: storybookUserInformation,
    isLoading: false,
    isError: false,
  };
}

export {usePaginationWithSearch};
