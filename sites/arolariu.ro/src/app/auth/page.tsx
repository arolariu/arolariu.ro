/** @format */

import {fetchUser} from "@/lib/actions/fetchUser";
import {type Metadata} from "next";
import {redirect} from "next/navigation";
import RenderAuthScreen from "./island";

export const metadata: Metadata = {
  title: "Auth",
  description: "The authentication page for the `arolariu.ro` platform.",
};

/**
 * The main authentication page.
 * @returns The main authentication page.
 */
export default async function AuthPage() {
  const {isAuthenticated} = await fetchUser();
  if (isAuthenticated) return redirect("/");
  return <RenderAuthScreen />;
}
