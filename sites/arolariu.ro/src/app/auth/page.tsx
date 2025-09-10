import {fetchUser} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import {getLocale, getTranslations} from "next-intl/server";
import {redirect} from "next/navigation";
import type {Metadata} from "next/types";
import RenderAuthScreen from "./island";

/**
 * Generates metadata for the authentication page.
 * @returns The metadata for the authentication page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Authentication.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * The main authentication page.
 * @returns The main authentication page.
 */
export default async function AuthPage(): Promise<React.JSX.Element> {
  const {isAuthenticated} = await fetchUser();
  if (isAuthenticated) {
    return redirect("/");
  }
  return <RenderAuthScreen />;
}
