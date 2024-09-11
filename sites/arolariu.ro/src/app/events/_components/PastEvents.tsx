/** @format */

import {EventCard} from "./EventCard";

export const PastEvents = () => {
  return (
    <section>
      <h1 className='my-8 text-center font-bold 2xsm:text-2xl xsm:text-3xl md:text-4xl'>Archive</h1>
      <div className='mx-auto my-12 flex justify-center'>
        <span className='inline-block h-2 w-60 rounded-full bg-blue-500' />
        <span className='mx-1 inline-block h-2 w-6 rounded-full bg-blue-500' />
        <span className='inline-block h-2 w-3 rounded-full bg-blue-500' />
      </div>
      <article className='2xsm:hidden md:block md:text-center'>
        This section contains an archive of the past events that were hosted by <code>arolariu.ro</code>.<br />
        The events are designed to be fun, accessible, interesting and valuable.
      </article>

      <section className='flex flex-col flex-wrap items-center justify-center justify-items-center gap-8 p-8 md:flex-row'>
        <EventCard
          title='Learn how to program in C/C++11'
          description='The event will cover some advanced topics such as pointers, memory management, and more.'
          date='2020-08-01'
          location='Online'
          imagePath='https://dummyimage.com/720x400&text=Learning+C%2FC%2B%2B11'
          buttons={{
            internal: {
              label: "View event recap.",
              href: "/events/learning-c-cpp11",
            },
            external: {
              label: "Registration closed.",
              href: "https://forms.gle/45kMjeTqbbqdDaE68",
              disabled: true,
            },
          }}
        />
        <EventCard
          title='System Design 101 - L100'
          description='Learn the basics of system design and how to approach any architecture interview with no stress.'
          date='2024-03-01'
          location='Online'
          imagePath='https://dummyimage.com/720x400&text=System+Design+101+%2D+L100'
          buttons={{
            internal: {
              label: "View event recap.",
              href: "/events/system-design-101-l100",
            },
            external: {
              label: "Registration closed.",
              href: "https://forms.office.com/r/m1KGUNs5A8",
              disabled: true,
            },
          }}
        />
        <EventCard
          title='System Design 101 - L200'
          description='Learn the basics of system design and how to approach any architecture interview with no stress.'
          date='2024-05-01'
          location='Online'
          imagePath='https://dummyimage.com/720x400&text=System+Design+101+%2D+L200'
          buttons={{
            internal: {
              label: "View event recap.",
              href: "/events/system-design-101-l200",
            },
            external: {
              label: "Registration closed.",
              href: "https://forms.office.com/r/m1KGUNs5A8",
              disabled: true,
            },
          }}
        />
        <EventCard
          title='System Design 101 - L100'
          description='Learn the basics of system design and how to approach any architecture interview with no stress.'
          date='2024-06-01'
          location='Online'
          imagePath='https://dummyimage.com/720x400&text=System+Design+101+%2D+L100'
          buttons={{
            internal: {
              label: "View event recap.",
              href: "/events/system-design-101-l100",
            },
            external: {
              label: "Registration closed.",
              href: "https://forms.office.com/r/m1KGUNs5A8",
              disabled: true,
            },
          }}
        />
        <EventCard
          title='System Design 101 - L200'
          description='Learn the basics of system design and how to approach any architecture interview with no stress.'
          date='2024-07-01'
          location='Online'
          imagePath='https://dummyimage.com/720x400&text=System+Design+101+%2D+L200'
          buttons={{
            internal: {
              label: "View event recap.",
              href: "/events/system-design-101-l200",
            },
            external: {
              label: "Registration closed.",
              href: "https://forms.office.com/r/m1KGUNs5A8",
              disabled: true,
            },
          }}
        />
      </section>
    </section>
  );
};
