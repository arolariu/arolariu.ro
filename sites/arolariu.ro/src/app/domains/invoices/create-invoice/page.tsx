import {fetchUser} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import {getLocale, getTranslations} from "next-intl/server";
import type {Metadata} from "next/types";
import RenderCreateInvoiceScreen from "./island";

/**
 * Generates metadata for the create invoice page.
 * @returns The metadata for the create invoice page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Domains.services.invoices.service.create-page.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * The create invoice page, where users can create a new invoice.
 * Unaunthenticated users have a small disclaimer at the bottom of the page.
 * @returns The create invoice page, SSR'ed.
 */
export default async function CreateInvoicePage() {
  const t = await getTranslations("Domains.services.invoices.service.create-page");
  const {isAuthenticated} = await fetchUser();

  return (
    <main className='flex flex-col flex-wrap items-center justify-center justify-items-center px-5 py-24 text-center'>
      <RenderCreateInvoiceScreen />
      {!isAuthenticated && <small className='2xsm:text-md md:text-md mb-4 p-8 lg:text-xl 2xl:text-2xl'>({t("disclaimer")})</small>}
    </main>
  );
}
