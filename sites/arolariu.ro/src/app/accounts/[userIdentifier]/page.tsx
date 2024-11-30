/** @format */

import {fetchUser} from "@/lib/actions/user/fetchUser";
import {generateGuid} from "@/lib/utils.generic";

type Params = Promise<{userIdentifier: string}>;

/**
 * The account page.
 * @returns The account page.
 */
export default async function AccountPage(props: Readonly<{params: Params}>) {
  const params = await props.params;

  const {user, isAuthenticated} = await fetchUser();
  const emailHash =
    user !== null && typeof user.email === "string"
      ? await crypto.subtle.digest("SHA-256", new TextEncoder().encode(user.email))
      : null;

  const userIdentifier = emailHash ? generateGuid(emailHash) : "00000000-0000-0000-0000-000000000000";
  const accountsAreDifferent = userIdentifier !== params.userIdentifier;

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-4 px-5 py-24 text-center lg:gap-8'>
      <section>
        <h1> You are {isAuthenticated ? "authenticated" : "not authenticated"}. </h1>
        <h1> Your account is {params.userIdentifier} </h1>
        <h1> The account you accessed is: {userIdentifier}</h1>

        <h2> The accounts are: {accountsAreDifferent ? "different" : "the same"} </h2>
      </section>
    </main>
  );
}
