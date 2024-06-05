/** @format */

import {type Metadata} from "next";
import {Suspense} from "react";
import {PastEvents} from "./_components/PastEvents";
import {PresentEvents} from "./_components/PresentEvents";
import Loading from "./loading";

export const metadata: Metadata = {
  title: "Events",
  description: "Upcoming events that will be hosted by arolariu.ro",
};

/**
 * The events page.
 * @returns The events page.
 */
export default async function EventsPage() {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center px-5 pt-24 text-center'>
      <Suspense fallback={<Loading />}>
        <PresentEvents />
        <PastEvents />
      </Suspense>
      <section className='my-16 pb-32'>
        <h2 className='text-3xl font-bold'>Thank you.</h2>
      </section>
    </main>
  );
}
