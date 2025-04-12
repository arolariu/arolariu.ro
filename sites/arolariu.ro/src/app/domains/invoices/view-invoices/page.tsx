/** @format */

import {fetchUser} from "@/lib/actions/user/fetchUser";
import {RichText} from "@/presentation/Text";
import type {Metadata} from "next";
import {getTranslations} from "next-intl/server";
import RenderViewInvoicesScreen from "./island";

export const metadata: Metadata = {
  title: "Invoice Management System - List Invoices",
  description: "List all invoices from the invoice management system.",
};

/**
 * The view invoices page, SSR'ed.
 * @returns The view invoices page server-side component.
 */
export default async function ViewInvoicesPage() {
  const t = await getTranslations("Domains.services.invoices.service.view-invoices");
  const {user} = await fetchUser();
  const username = user?.fullName ?? "dear guest";

  return (
    <main className='container mx-auto px-5 py-24'>
      <section className='mb-20 flex w-full flex-col text-center'>
        <h1 className='mb-4 bg-linear-to-r from-pink-400 to-red-600 bg-clip-text text-2xl font-medium text-transparent sm:text-3xl'>
          {t("title", {name: username})}
        </h1>
        <article className='mx-auto text-base leading-relaxed lg:w-2/3'>
          <RichText
            sectionKey='Domains.services.invoices.service.view-invoices'
            textKey='subtitle'
          />
        </article>
      </section>
      <RenderViewInvoicesScreen />
    </main>
  );
}
