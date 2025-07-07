/** @format */

"use client";

import {SITE_URL} from "@/lib/utils.generic";
import {UserInformation} from "@/types";
import {useEffect, useRef, useState} from "react";

type HookReturnType = Readonly<{
  userInformation: UserInformation;
  isLoading: boolean;
  isError: boolean;
}>;

/**
 * This hook fetches the user information.
 * @returns The user information and loading state.
 */
export function useUserInformation(): HookReturnType {
  const [userInformation, setUserInformation] = useState<UserInformation>({
    user: null,
    userIdentifier: "00000000-0000-0000-0000-000000000000",
    userJwt: "",
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    abortControllerRef.current?.abort("New request initiated.");

    abortControllerRef.current = new AbortController();
    const {signal} = abortControllerRef.current;

    const fetchUserInformation = async (signal: AbortSignal) => {
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

    fetchUserInformation(signal);

    return () => {
      abortControllerRef.current?.abort("Request aborted by cleanup function.");
    };
  }, []);

  return {userInformation, isLoading, isError};
}
