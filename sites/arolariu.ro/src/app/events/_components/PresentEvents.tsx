/** @format */

import {EventCard} from "./EventCard";

export const PresentEvents = () => {
  return (
    <section>
      <h1 className='my-8 text-center font-bold 2xsm:text-2xl xsm:text-3xl md:text-4xl'>Upcoming events</h1>
      <div className='mx-auto my-12 flex justify-center'>
        <span className='inline-block h-2 w-60 rounded-full bg-blue-500' />
        <span className='mx-1 inline-block h-2 w-6 rounded-full bg-blue-500' />
        <span className='inline-block h-2 w-3 rounded-full bg-blue-500' />
      </div>
      <article className='2xsm:hidden md:block md:text-center'>
        This section contains the upcoming events that will be hosted by <code>arolariu.ro</code>.<br />
        The events are designed to be fun, accessible, interesting and valuable.
      </article>

      <section className='flex flex-col flex-wrap items-center justify-center justify-items-center gap-8 p-8 md:flex-row'>
        <EventCard
          date='2024-09-26'
          title="The 'OmniOpenCon' open-source conference!"
          description='The conference will cover a wide range of topics, from open-source software to hardware and more. I will be speaking about Open Telemetry and observability.'
          location='Politehnica Bucuresti, Bucharest, Romania'
          buttons={{
            external: {
              label: "Learn more.",
              href: "https://omniopencon.org",
            },
          }}
          imagePath='https://dummyimage.com/720x400&text=OmniOpenCon+%2D+2024'
        />
      </section>
    </section>
  );
};
