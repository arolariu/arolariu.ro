/** @format */

import * as m from "@/i18n/messages";
import {type Metadata} from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms of service for arolariu.ro",
};

/**
 * The terms of service page.
 * @returns The terms of service page.
 */
export default async function TermsOfServicePage() {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <section className='pb-12'>
        <h1 className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>
          {m.termsOfService()}
        </h1>
        <p className='text-center'>{m.termsOfService_last_updated()}</p>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_general_terms()}</h2>
        <article className='italic'>{m.termsOfService_general_terms_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_license_terms()}</h2>
        <article className='italic'>{m.termsOfService_license_terms_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_definitions()}</h2>
        <article className='italic'>{m.termsOfService_definitions_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_restrictions()}</h2>
        <article className='italic'>{m.termsOfService_restrictions_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_your_consent()}</h2>
        <article className='italic'>{m.termsOfService_your_consent_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_links_to_other_websites()}</h2>
        <article className='italic'>{m.termsOfService_links_to_other_websites_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_cookies()}</h2>
        <article className='italic'>{m.termsOfService_cookies_content()} </article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_changes_to_tos()}</h2>
        <article className='italic'>{m.termsOfService_changes_to_tos_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_updates_to_service()}</h2>
        <article className='italic'>{m.termsOfService_updates_to_service_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_third_party_services()}</h2>
        <article className='italic'>{m.termsOfService_third_party_services_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_termination()}</h2>
        <article className='italic'>{m.termsOfService_termination_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_no_warranties()}</h2>
        <article className='italic'>{m.termsOfService_no_warranties_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_limitation_liability()}</h2>
        <article className='italic'>{m.termsOfService_limitation_liability_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_severability()}</h2>
        <article className='italic'>{m.termsOfService_severability_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_waiver()}</h2>
        <article className='italic'>{m.termsOfService_waiver_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_amendments_to_agreement()}</h2>
        <article className='italic'>{m.termsOfService_amendments_to_agreement_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_entire_agreement()}</h2>
        <article className='italic'>{m.termsOfService_entire_agreement_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_updates_to_service()}</h2>
        <article className='italic'>{m.termsOfService_updates_to_service_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_notice_of_dispute()}</h2>
        <article className='italic'>{m.termsOfService_notice_of_dispute_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_agreement_to_arbitrate()}</h2>
        <article className='italic'>{m.termsOfService_agreement_to_arbitrate_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_submissions_and_privacy()}</h2>
        <article className='italic'>{m.termsOfService_submissions_and_privacy_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_promotions()}</h2>
        <article className='italic'>{m.termsOfService_promotions_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_typography_errors()}</h2>
        <article className='italic'>{m.termsOfService_typography_errors_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_miscellaneous_terms()}</h2>
        <article className='italic'>{m.termsOfService_miscellaneous_terms_content()}</article>
      </section>
      <section>
        <h2 className='text-2xl font-black underline'>{m.termsOfService_disclaimer()}</h2>
        <article className='italic'>{m.termsOfService_disclaimer_content()}</article>
      </section>
      <article className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text pt-8 text-3xl font-black italic text-transparent'>
        {m.termsOfService_contact_content()}
      </article>
    </main>
  );
}
