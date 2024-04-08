import {SITE_URL} from "@/constants";
import {fetchUser} from "@/lib/utils.server";
import Link from "next/link";

interface Props {
  className?: string;
}

/**
 * This function renders the navigation bar.
 * @returns The navigation bar.
 */
export default async function Navigation({className}: Readonly<Props>) {
  const {user, isAuthenticated} = await fetchUser();

  return (
    <ul className={className}>
      <li>
        <Link
          href={`${SITE_URL}/domains`}
          className='indicator mr-5 hover:text-yellow-300'>
          Domains
        </Link>
      </li>
      <li>
        <Link
          href={`${SITE_URL}/events`}
          className='indicator mr-5 hover:text-yellow-300'>
          Events
        </Link>
      </li>

      {!isAuthenticated && (
        <li>
          <Link
            href={`${SITE_URL}/auth`}
            className='indicator mr-5 hover:text-yellow-300'>
            Auth
          </Link>
        </li>
      )}
      {!!isAuthenticated && (
        <li>
          <Link
            href={`${SITE_URL}/accounts/${user?.id ?? ""}`}
            className='indicator mr-5 hover:text-yellow-300'>
            Account
          </Link>
        </li>
      )}
    </ul>
  );
}
