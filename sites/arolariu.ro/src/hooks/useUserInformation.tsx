/** @format */

import {SITE_URL} from "@/lib/utils.generic";
import type {UserInformation} from "@/types/UserInformation";
import {useEffect, useRef, useState, type DependencyList} from "react";

/**
 * This hook fetches the user information.
 * @returns The user information and loading state.
 */
export default function useUserInformation(
  {dependencyArray}: Readonly<{dependencyArray: DependencyList}> = {dependencyArray: []} as const,
) {
  const [userInformation, setUserInformation] = useState<UserInformation>({} as UserInformation);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const {signal} = abortControllerRef.current;

    const fetchUserInformation = async () => {
      try {
        setIsLoading(true);
        try {
          const userInformationResponse = await fetch(`${SITE_URL}/api/user`, {signal});
          const userInformationAsJson = await userInformationResponse.json();
          setUserInformation(userInformationAsJson as UserInformation);
        } catch (error) {
          console.error("useUserInformation", error as Error);
          setIsError(true);
        }
      } catch (error) {
        console.error("useUserInformation", error as Error);
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
