/** @format */

import {FlipWords} from "@/components/ui/flip-words";
import {TypewriterEffect} from "@/components/ui/typewriter";
import NewsletterArticleCard from "./_components/NewsletterArticleCard";
import SubscribeForm from "./_components/SubscribeForm";

/**
 * The newsletter page.
 * @returns The newsletter page.
 */
export default function NewsletterPage() {
  const attributes = ["professional", "successful", "humble", "independent"];
  return (
    <main className='px-12 py-24'>
      <section className='hero'>
        <article className='flex flex-col items-center gap-20 text-center'>
          <h1 className='pb-4 text-2xl font-black  md:text-5xl '>
            Build your professional career
            <br />
            with our amazing tips and become a<br />
            <FlipWords
              words={attributes}
              duration={1500}
              className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent'
            />
            software engineer.
          </h1>
          <article className='max-w-screen-md text-lg '>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Hic autem, est eaque nihil necessitatibus porro
            facere ut sed dolore, iste nam? Quas minus consequuntur, beatae quis officia architecto expedita sunt?
          </article>
          <SubscribeForm />
        </article>
      </section>
      <section>
        <div className='mx-auto w-full max-w-7xl px-4 py-10 md:w-3/4 lg:w-2/4'>
          <div className='mb-5 text-left md:text-center'>
            <TypewriterEffect
              words={"Latest Articles".split(" ").map((word) => {
                return {text: word};
              })}
              cursorClassName='hidden'
            />
          </div>
          <div className='flex flex-col space-y-12 divide-y divide-black dark:divide-white'>
            <NewsletterArticleCard />
            <NewsletterArticleCard />
            <NewsletterArticleCard />
          </div>
        </div>
      </section>
    </main>
  );
}
