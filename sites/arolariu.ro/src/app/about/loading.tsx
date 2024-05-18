/** @format */

import {Skeleton} from "@/components/ui/skeleton";

/**
 * The loading screen for the about homepage
 * @returns Loading screen for the about homepage
 */
export default async function Loading() {
  return (
    <main>
      <section>
        <center className='container mx-auto px-5 pt-24'>
          <Skeleton className='h-[20px] w-[250px] rounded-xl' />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
          <br />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
        </center>
      </section>
      <section className='mb-16 flex flex-row flex-wrap items-center justify-center justify-items-center pb-16 text-center'>
        <div className='gap-4 p-8'>
          <Skeleton className='h-[500px] w-[650px] rounded-xl' />
          <Skeleton className='h-[20px] w-[250px] rounded-xl' />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
          <br />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
        </div>
        <div className='gap-4 p-8'>
          <Skeleton className='h-[500px] w-[650px] rounded-xl' />
          <Skeleton className='h-[20px] w-[250px] rounded-xl' />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
          <br />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
        </div>
      </section>
    </main>
  );
}
