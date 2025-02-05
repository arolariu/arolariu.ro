/** @format */

"use client";

import {SITE_URL} from "@/lib/utils.generic";
import {UserInformation} from "@/types";
import {useCallback, useEffect, useRef, useState} from "react";

type HookReturnType = Readonly<{
  userInformation: UserInformation | null;
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches the user information.
 * @returns The user information and loading state.
 */
export function useUserInformation(): HookReturnType {
  const [userInformation, setUserInformation] = useState<UserInformation | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  const fetchUserInformation = useCallback(async (signal: AbortSignal) => {
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
  }, []);

  useEffect(() => {
    abortControllerRef.current?.abort("New request initiated.");
    // eslint-disable-next-line functional/immutable-data -- We need to mutate the ref.
    abortControllerRef.current = new AbortController();
    const {signal} = abortControllerRef.current!;

    fetchUserInformation(signal);

    return () => {
      abortControllerRef.current?.abort("Request aborted by cleanup function.");
    };
  }, []);

  return {userInformation, isLoading, isError};
}
