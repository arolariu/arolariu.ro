/** @format */

import {SITE_URL} from "@/lib/utils.generic";
import type {UserInformation} from "@/types/UserInformation";
import {useEffect, useState, type DependencyList} from "react";

/**
 * This hook fetches the user information.
 * @returns The user information and loading state.
 */
export default function useUserInformation(
  {dependencyArray}: Readonly<{dependencyArray: DependencyList}> = {dependencyArray: []} as const,
) {
  const [userInformation, setUserInformation] = useState<UserInformation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  useEffect(() => {
    const abortController = new AbortController();
    const {signal} = abortController;

    const fetchUserInformation = async () => {
      try {
        setIsLoading(true);
        const userInformationResponse = await fetch(`${SITE_URL}/api/user`, {signal});
        const userInformationAsJson = await userInformationResponse.json();
        setUserInformation(userInformationAsJson as UserInformation);
      } catch (error) {
        console.error("useUserInformation", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInformation().catch((error: unknown) => console.error("useUserInformation", error));

    return () => abortController.abort();
  }, dependencyArray);

  return {userInformation, isLoading, isError};
}
