"use client";

/**
 * @fileoverview Custom React hook for fetching authenticated user information with JWT.
 * @module hooks/useUserInformation
 */

import {SITE_URL} from "@/lib/utils.generic";
import {UserInformation} from "@/types";
import {useEffect, useRef, useState} from "react";

/**
 * Return value from the useUserInformation hook.
 */
type HookReturnType = Readonly<{
  /** User information including Clerk user object, UUID identifier, and JWT token. */
  userInformation: UserInformation;
  /** True while the fetch operation is in progress. */
  isLoading: boolean;
  /** True if the fetch operation failed with an error. */
  isError: boolean;
}>;

/**
 * Fetches current authenticated user information including JWT token.
 *
 * @remarks
 * **Rendering Context**: Client Component hook (requires "use client" directive).
 *
 * **Data Fetching:**
 * - Fetches from internal API route `/api/user`
 * - Runs on component mount only (empty dependency array)
 * - Includes Clerk user object, UUID identifier, and JWT token
 * - JWT token used for backend API authentication
 *
 * **Request Cancellation:**
 * - Uses AbortController for proper cleanup
 * - Cancels in-flight requests when component unmounts
 * - Prevents memory leaks and state updates on unmounted components
 * - AbortController stored in ref to survive re-renders
 *
 * **State Management:**
 * - `isLoading`: True during fetch, false after completion
 * - `isError`: True if fetch fails (network error, auth failure)
 * - `userInformation`: Initialized with guest/anonymous defaults
 *
 * **Default Values:**
 * - `user`: null (unauthenticated)
 * - `userIdentifier`: "00000000-0000-0000-0000-000000000000" (nil UUID)
 * - `userJwt`: "" (empty string)
 *
 * **Error Handling:**
 * - Logs errors to console
 * - Sets `isError` flag but does not throw
 * - Retains default guest values on error
 *
 * **Authentication Flow:**
 * 1. Component mounts
 * 2. Hook calls `/api/user` endpoint
 * 3. Endpoint validates Clerk session
 * 4. Returns user data + JWT token
 * 5. Hook updates state with user information
 *
 * **Use Cases:**
 * - Displaying user profile information
 * - Authenticating API requests with JWT
 * - Conditional rendering based on auth state
 * - User-specific data fetching
 *
 * **Performance Considerations:**
 * - Fetches once per component mount
 * - No automatic revalidation or polling
 * - Consider wrapping in context provider for app-wide access
 * - JWT should be stored securely (not in localStorage)
 *
 * @returns Object containing user information, loading state, and error state
 *
 * @example
 * ```tsx
 * function UserProfile() {
 *   const {userInformation, isLoading, isError} = useUserInformation();
 *
 *   if (isLoading) return <Skeleton />;
 *   if (isError) return <ErrorMessage />;
 *   if (!userInformation.user) return <SignInPrompt />;
 *
 *   return (
 *     <div>
 *       <Avatar src={userInformation.user.imageUrl} />
 *       <h2>{userInformation.user.firstName}</h2>
 *       <Badge>ID: {userInformation.userIdentifier}</Badge>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Using JWT for authenticated API calls
 * function InvoiceActions() {
 *   const {userInformation} = useUserInformation();
 *
 *   const deleteInvoice = async (id: string) => {
 *     await fetch(`/api/invoices/${id}`, {
 *       method: "DELETE",
 *       headers: {
 *         Authorization: `Bearer ${userInformation.userJwt}`,
 *       },
 *     });
 *   };
 *
 *   return <Button onClick={() => deleteInvoice("123")}>Delete</Button>;
 * }
 * ```
 *
 * @see {@link UserInformation} - Type definition for user information object
 * @see {@link https://clerk.com/docs Clerk Authentication Documentation}
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
