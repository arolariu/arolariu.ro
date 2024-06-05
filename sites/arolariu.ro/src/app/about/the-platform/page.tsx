/** @format */

import {type Metadata} from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Platform",
  description: "Learn more about the platform that you are currently on.",
};

/**
 * The platform page.
 * @returns The platform page
 */
export default function PlatformPage() {
  return (
    <section>
      <h1 className='my-8 font-bold 2xsm:text-2xl xsm:text-3xl md:text-4xl'>
        What is <code>arolariu.ro</code>?
      </h1>
      <div className='mx-auto my-12'>
        <span className='inline-block h-2 w-60 rounded-full bg-blue-500' />
        <span className='mx-1 inline-block h-2 w-6 rounded-full bg-blue-500' />
        <span className='inline-block h-2 w-3 rounded-full bg-blue-500' />
      </div>
      <article className='2xsm:p-2 2xsm:text-lg lg:text-xl 2xl:p-16 2xl:text-2xl'>
        The <code>arolariu.ro</code> platform is a personal project made by{" "}
        <Link
          href='/about/the-author'
          className='text-blue-500'>
          <em>Alexandru-Razvan Olariu.</em>
        </Link>
        <br />
        <br />
        The platform is built using the latest stable iterations of different technologies such as Next.JS, React, and
        TailwindCSS; according to several design principles and best practices, such as the use of atomic design, the
        use of a mobile-first approach, and the use of a component-based architecture. The platform is also built with
        accessibility in mind, and it is designed to be as accessible as possible.
        <br />
        <br />
        In order for the platform to grow and evolve, it is built with a modular architecture in mind, and it is
        designed to be easily extensible and maintainable. The platform is also built with a focus on performance, and
        it is designed to be as performant as possible. This is thanks to the use of modern web technologies and the use
        of a modern front-end framework such as Next.JS.
        <br />
        <br />
        The API service that powers the platform and the adjacent services hosted under the <code>
          *.arolariu.ro
        </code>{" "}
        domain umbrella is built using the latest iteration of .NET LTS. The API can be accessed on{" "}
        <Link
          href='https://api.arolariu.ro'
          target='_blank'
          rel='noopener'
          className='text-blue-500'>
          <code>api.arolariu.ro</code>
        </Link>
        .
      </article>
    </section>
  );
}
