/** @format */

import Competence from "@/components/Features/Competence";
import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {FaRegSun, FaUserCheck} from "react-icons/fa";
import {GrResources, GrTest} from "react-icons/gr";
import {SiThealgorithms} from "react-icons/si";
import {SlLoop} from "react-icons/sl";

export const metadata: Metadata = {
  title: "About the author",
  description: "Learn more about Alexandru-Razvan Olariu, the author of this platform.",
};

/**
 * The author page.
 * @returns The author page.
 */
export default function AuthorPage() {
  return (
    <>
      <section>
        <h1 className='font-bold 2xsm:text-2xl xsm:text-3xl md:text-4xl'>Meet the author.</h1>
        <div className='mx-auto mt-6'>
          <span className='inline-block h-2 w-60 rounded-full bg-blue-500' />
          <span className='mx-1 inline-block h-2 w-6 rounded-full bg-blue-500' />
          <span className='inline-block h-2 w-3 rounded-full bg-blue-500' />
        </div>
        <article className='2xsm:p-2 2xsm:text-lg lg:text-xl 2xl:p-16 2xl:text-2xl'>
          Alexandru-Razvan Olariu is the author of the platform that you are currently browsing.
          <br />
          <br />
          Alexandru is a {new Date().getFullYear() - 2000} years old software engineer and solution architect. He
          currently works at Microsoft as a software enginneer in the E+D organization, building complex solutions for
          the Sovereign Clouds line of business.
          <br />
          <br />
          Alexandru was born on the 8th of January, year 2000 in a small city called <code>Curtea de Arges</code> in
          Romania. He got his first computer when he was just 5 years old - a Pentium 4 E2220 Dual-Core 2.4 GHz with 512
          MB of RAM and 10 GB of storage, running Windows 98. He learnt most of his computer skills by playing video
          games and tinkering with his personal computer. He also learnt a good amount of English and was able to
          fluently read, write and speak in English by the age of 7.
          <br />
          <br />
          Alexandru is a video game enthusiast. He used to be a &quot;professional&quot; player, ranking at #70 in
          Romania for the video game called `DotA2`. He enjoys playing long-lasting games that have a focus on
          strategies and a medieval setting: like Age of Empires, Age of Mythology, etc. He also enjoys playing games
          such as Red Alert, StarCraft, and other RTS games. <br /> <br />
          Alexandru enjoys reading technical books and tinkering with new technologies. He has built this platform as a
          `test-bench` for new technologies and as a way to learn new things. He is also a big fan of the `open-source`
          movement and has contributed to Microsoft&apos;s OSS repositories{" "}
          <em>(dotnet/efcore, dotnet/docs, azure/docs)</em>. <br /> <br />
          Alexandru is open for collaboration in projects that involve any of the Internet of Things, Software
          Engineering and Network Engineering fields. <br /> If you are interested in working with Alexandru and you
          wonder what he is capable of, please visit the `cv.arolariu.ro` website to see his CV. <br /> <br />
          To reach out to him, scroll down to the contact information section, or connect with him via the information
          provided on the{" "}
          <Link
            href='https://cv.arolariu.ro'
            className='text-blue-500'>
            cv.arolariu.ro
          </Link>{" "}
          website. <br /> <br />
        </article>
      </section>{" "}
      {/* About the author */}
      <section className='my-16'>
        <h1 className='text-center 2xsm:text-3xl md:text-5xl'>Alexandru&apos;s competences</h1>
        <div className='mx-auto flex flex-row flex-wrap px-5 py-8'>
          <Competence
            title='Algorithmic skills.'
            description='Alexandru has completed all Hacker Rank, Hacker Earth and Leet Code challenges published until 2023. He
								has a strong algorithmic thinking and is able to construct complex algorithms with ease.'>
            <SiThealgorithms className='h-7 w-7' />
          </Competence>
          <Competence
            title='Test-Driven Development (TDD)'
            description='Alexandru is a firm believer of test-driven development. He constantly applies this approach to his
								projects and he is always trying to improve his testing skills. He is also a big fan of the
								`red-green-refactor` approach.'>
            <GrTest className='h-7 w-7' />
          </Competence>
          <Competence
            title='Domain-Driven Design (DDD)'
            description='Alexandru follows domain-driven design principles strongly. He is able to combine DDD with TDD to create
								complex solutions that are easy to maintain and extend. He is also a big fan of the `onion architecture`
								and `clean architecture` approaches.'>
            <GrResources className='h-7 w-7' />
          </Competence>
          <Competence
            title='Agile Methodologies.'
            description='Alexandru has learnt about agile working and agile methodologies since he was a student in his BSc.
								degree. He follows the agile manifesto and is a big fan of the Kanban technique of planning.'>
            <SlLoop className='h-7 w-7' />
          </Competence>
          <Competence
            title='Customer Centric.'
            description="Alexandru has been working with customers for many years, in his tenure at Microsoft. He has gained a lot
					of knowledge and is able to put himself in the shoes of the customer. He is able to understand the
					customer's needs and to deliver solutions that are exactly tailored to their needs.">
            <FaUserCheck className='h-7 w-7' />
          </Competence>
          <Competence
            title='Engineering Excellence.'
            description='Alexandru is passionate about delivering the best solutions for the problem and for the customer. He is
								always striving to deliver the best software and to follow consacrated engineering excellence practices. A perfect solution is a solution that is easy to maintain, extend and understand, not the one that is the most complex.'>
            <FaRegSun className='h-7 w-7' />
          </Competence>
        </div>
      </section>{" "}
      {/* Competences list */}
      <section className='my-16 mb-16 flex flex-row flex-wrap items-center justify-center justify-items-center'>
        <div className='prose prose-blue text-left 2xsm:text-center md:text-left'>
          <h1 className='mb-16 font-semibold text-black dark:text-white'>Connect with Alexandru</h1>
          <div className='text-2xl'>
            <p>
              E-mail address: <a href='mailto:olariu.alexandru@pm.me'>olariu.alexandru@pm.me</a>
            </p>
            <p>
              LinkedIn:{" "}
              <Link href='https://www.linkedin.com/in/olariu-alexandru/'>
                <code>/olariu-alexandru</code>
              </Link>
            </p>
            <p>
              GitHub:{" "}
              <Link href='https://www.github.com/arolariu/'>
                <code>/arolariu</code>
              </Link>
            </p>
          </div>
        </div>
        <Image
          src='/images/about/the-author/work-together.svg'
          alt='Work Together SVG'
          width='600'
          height='600'
          className='ml-[10%] object-fill 2xsm:hidden xl:block'
        />
      </section>
    </>
  );
}
