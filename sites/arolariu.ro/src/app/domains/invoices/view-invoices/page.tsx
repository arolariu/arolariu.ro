import {FakeInvoiceBigList} from "@/data/mocks/invoices";
import {fetchUser} from "@/lib/actions/user/fetchUser";
import {createMetadata} from "@/metadata";
import {RichText} from "@/presentation/Text";
import {getLocale, getTranslations} from "next-intl/server";
import type {Metadata} from "next/types";
import RenderViewInvoicesScreen from "./island";

/**
 * Generates the metadata for the view invoices page.
 * @returns The metadata for the view invoices page.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Domains.services.invoices.service.view-invoices.__metadata__");
  const locale = await getLocale();
  return createMetadata({
    locale,
    title: t("title"),
    description: t("description"),
  });
}

/**
 * The view invoices page, SSR'ed.
 * @returns The view invoices page server-side component.
 */
export default async function ViewInvoicesPage() {
  const t = await getTranslations("Domains.services.invoices.service.view-invoices");
  const {user} = await fetchUser();
  const username = user?.fullName ?? "dear guest";

  const invoices = FakeInvoiceBigList;

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
      <section>
        <RenderViewInvoicesScreen invoices={invoices} />
      </section>
    </main>
  );
}
