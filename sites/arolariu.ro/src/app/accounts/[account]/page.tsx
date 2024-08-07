/** @format */

import {fetchUser} from "@/lib/actions/fetchUser";
import {UserProfile} from "@clerk/nextjs";

interface Props {
  params: {
    account: string;
  };
}

/**
 * The account page.
 * @returns The account page.
 */
export default async function AccountPage({params}: Readonly<Props>) {
  const {user, isAuthenticated} = await fetchUser();

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-4 px-5 py-24 text-center lg:gap-8'>
      <section>
        <UserProfile />
      </section>
      <section>
        <h1> You are {isAuthenticated ? "authenticated" : "not authenticated"}. </h1>
        <h1> Your account is {params.account} </h1>
        <h1> Your user is {user?.id} </h1>

        <h2> The user id and the account are: {user?.id === params.account ? "the same" : "different"} </h2>
      </section>
    </main>
  );
}
