/** @format */

"use client";

import {SITE_URL} from "@/lib/utils.generic";
import type {UserInformation} from "@/types/UserInformation";
import {useEffect, useRef, useState, type DependencyList} from "react";

type HookReturnType = Readonly<{
  userInformation: UserInformation | null;
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches the user information.
 * @returns The user information and loading state.
 */
export default function useUserInformation(
  {dependencyArray}: Readonly<{dependencyArray: DependencyList}> = {dependencyArray: []} as const,
): HookReturnType {
  const [userInformation, setUserInformation] = useState<UserInformation | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
    }

    // eslint-disable-next-line functional/immutable-data
    abortControllerRef.current = new AbortController();
    const {signal} = abortControllerRef.current;

    const fetchUserInformation = async () => {
      try {
        setIsLoading(true);
        const userInformationResponse = await fetch(`${SITE_URL}/api/user`, {signal});
        const userInformationAsJson = await userInformationResponse.json();
        setUserInformation(userInformationAsJson as UserInformation);
      } catch (error: unknown) {
        console.error(">>> Error fetching user information in useUserInformation hook:", error as Error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInformation();

    return () => {
      if (isLoading) {
        abortControllerRef.current?.abort();
      }
    };
  }, dependencyArray);

  return {userInformation, isLoading, isError};
}
