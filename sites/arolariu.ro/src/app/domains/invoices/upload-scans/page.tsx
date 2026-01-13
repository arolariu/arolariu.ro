import {fetchAaaSUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import {redirect} from "next/navigation";
import RenderUploadScansScreen from "./island";

/**
 * Generates SEO metadata for the scan upload page.
 */
export async function generateMetadata(): Promise<Metadata> {
  // Translation types will be regenerated on next build
  const t = (await getTranslations(
    "Domains.services.invoices.service.upload-scans.__metadata__" as "Domains.services.invoices.service.view-invoices.__metadata__",
  )) as (key: string) => string;
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Upload scans page - allows users to upload scans without creating invoices.
 *
 * @remarks
 * This page requires authentication since scans are stored with user metadata.
 * Unauthenticated users are redirected to sign-in.
 */
export default async function UploadScansPage(): Promise<React.JSX.Element> {
  const {isAuthenticated} = await fetchAaaSUserFromAuthService();

  if (!isAuthenticated) {
    redirect("/auth/sign-in?redirect_url=/domains/invoices/upload-scans");
  }

  return (
    <main className='min-h-screen px-4 py-12 sm:px-6 lg:px-8'>
      <RenderUploadScansScreen />
    </main>
  );
}
