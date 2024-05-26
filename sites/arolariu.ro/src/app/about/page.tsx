/** @format */

import {type Metadata} from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn more about the author and the platform.",
};

/**
 * The about page.
 * @returns The about page.
 */
export default function AboutPage() {
  return (
    <>
      <section>
        <h1 className='mb-4 bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent sm:text-3xl '>
          About Us
        </h1>
        <article>
          The <code>arolariu.ro</code> story began in 2022, when the author - Alexandru-Razvan Olariu, wanted to
          understand how websites work.
          <br />
          <br />
          The whole platform and underlying integrations have been developed solely by the author, from what he has
          learnt along the years.
          <br />
          <br />
          Alexandru currently works as a software engineer at Microsoft. To learn more about him, check the right
          section of this page. <br /> The platform is built using the latest state-of-the-art technologies. To learn
          more about it, check the left section of this page.
        </article>
      </section>
      <section className='mb-16 flex flex-col flex-nowrap pb-16 lg:flex-row'>
        <div className='p-4 lg:w-1/2'>
          <Image
            alt='content'
            width={300}
            height={500}
            src='/images/about/platform-thumbnail.svg'
          />
          <h2 className='title-font mb-3 mt-6 text-2xl font-medium'>
            What is <code>arolariu.ro</code>?
          </h2>
          <article className='pb-8 text-base leading-relaxed'>
            The <code>arolariu.ro</code> platform is a collection of applications that are hosted under the{" "}
            <code>arolariu.ro</code> umbrella. <br /> The platform was built with the purpose of providing a unified
            experience for all of the applications and OSS projects that the author <em>(Alexandru-Razvan Olariu)</em>{" "}
            is working on. <br />
            <br />
            To learn more about the technologies that are used in the process and how they interact with each other,
            click the button below or navigate to <code>&quot;/about/the-platform&quot;</code>
          </article>
          <Link
            href='/about/the-platform'
            className='rounded-lg bg-indigo-500 p-4 text-white hover:bg-indigo-600 focus:outline-none dark:text-black'>
            Learn more about the platform...
          </Link>
        </div>
        <div className='p-4 lg:w-1/2'>
          <Image
            alt='content'
            className='mx-auto object-fill object-center'
            width={300}
            height={500}
            src='/images/about/author-thumbnail.svg'
          />
          <h2 className='title-font mb-3 mt-6 text-2xl font-medium'>
            Who is <code>arolariu</code>?
          </h2>
          <article className='pb-8 text-base leading-relaxed'>
            <code>arolariu</code> is the alias/nickname of the author: Alexandru-Razvan Olariu. <br /> Alexandru is a
            well-tenured software engineer, solution architect and lifelong learner. <br />
            <br />
            To learn more about Alexandru, click the button below or navigate to{" "}
            <code>&quot;/about/the-author&quot;</code>
          </article>
          <Link
            href='/about/the-author'
            className='rounded-lg bg-indigo-500 p-4 text-white hover:bg-indigo-600 focus:outline-none dark:text-black'>
            Learn more about the author...
          </Link>
        </div>
      </section>
    </>
  );
}
