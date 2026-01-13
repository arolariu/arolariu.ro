import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import {redirect} from "next/navigation";
import RenderViewScansScreen from "./island";

/**
 * Generates SEO metadata for the view scans page.
 */
export async function generateMetadata(): Promise<Metadata> {
  // Translation types will be regenerated on next build
  const t = (await getTranslations(
    "Domains.services.invoices.service.view-scans.__metadata__" as "Domains.services.invoices.service.view-invoices.__metadata__",
  )) as (key: string) => string;
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * View scans page - displays uploaded scans and allows invoice creation.
 *
 * @remarks
 * This page requires authentication since scans are user-specific.
 * Unauthenticated users are redirected to sign-in.
 */
export default async function ViewScansPage(): Promise<React.JSX.Element> {
  const {isAuthenticated} = await fetchAaaSUserFromAuthService();

  if (!isAuthenticated) {
    redirect("/auth/sign-in?redirect_url=/domains/invoices/view-scans");
  }

  return (
    <main className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <RenderViewScansScreen />
    </main>
  );
}
