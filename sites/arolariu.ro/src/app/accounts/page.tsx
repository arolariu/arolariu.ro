/** @format */

import {fetchUser} from "@/lib/actions/user/fetchUser";
import {generateGuid} from "@/lib/utils.generic";
import type {Metadata} from "next";
import {redirect} from "next/navigation";

export const metadata: Metadata = {
  title: "Accounts",
  description: "The accounts page.",
};

/**
 * The main accounts page.
 */
export default async function AccountsPage() {
  const {isAuthenticated, user} = await fetchUser();
  if (!isAuthenticated) return redirect("/auth/sign-in");

  const emailHash =
    user !== null && typeof user.email === "string"
      ? await crypto.subtle.digest("SHA-256", new TextEncoder().encode(user.email))
      : null;

  const userIdentifier = emailHash ? generateGuid(emailHash) : "00000000-0000-0000-0000-000000000000";
  return redirect(`/accounts/${userIdentifier}`);
}
