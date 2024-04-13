"use client";

import {fetchUser} from "@/lib/actions/fetchUser";
import Link from "next/link";
import {useEffect, useState} from "react";

interface Props {
  className?: string;
}

/**
 * This function renders the navigation bar.
 * @returns The navigation bar.
 */
export default function Navigation({className}: Readonly<Props>) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>();

  useEffect(() => {
    fetchUser()
      .then((user) => {
        setIsAuthenticated(user.isAuthenticated);
        setUserId(user.user?.id);
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  }, []);

  return (
    <ul className={className}>
      <li>
        <Link
          href={`/domains`}
          className='indicator mr-5 hover:text-yellow-300'>
          Domains
        </Link>
      </li>
      <li>
        <Link
          href={`/events`}
          className='indicator mr-5 hover:text-yellow-300'>
          Events
        </Link>
      </li>

      {!isAuthenticated && (
        <li>
          <Link
            href={`/auth`}
            className='indicator mr-5 hover:text-yellow-300'>
            Auth
          </Link>
        </li>
      )}
      {!!isAuthenticated && (
        <li>
          <Link
            href={`/accounts/${userId as string}`}
            className='indicator mr-5 hover:text-yellow-300'>
            Account
          </Link>
        </li>
      )}
    </ul>
  );
}
