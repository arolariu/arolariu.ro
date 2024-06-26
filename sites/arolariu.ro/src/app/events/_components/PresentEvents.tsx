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
          title='System Design 101 - L100'
          description='Learn the basics of system design and how to approach any architecture interview with no stress.'
          date='2024-06-01'
          location='Online'
          imagePath='https://dummyimage.com/720x400&text=System+Design+101+%2D+L100'
          formLink='https://forms.office.com/r/m1KGUNs5A8'
        />
        <EventCard
          title='System Design 101 - L200'
          description='Learn the basics of system design and how to approach any architecture interview with no stress.'
          date='2024-07-01'
          location='Online'
          imagePath='https://dummyimage.com/720x400&text=System+Design+101+%2D+L200'
          formLink='https://forms.office.com/r/m1KGUNs5A8'
        />
        <EventCard
          title='System Design 101 - L300'
          description='Learn the basics of system design and how to approach any architecture interview with no stress.'
          date='2024-08-01'
          location='Online'
          imagePath='https://dummyimage.com/720x400&text=System+Design+101+%2D+L300'
          formLink='https://forms.office.com/r/m1KGUNs5A8'
        />
      </section>
    </section>
  );
};
