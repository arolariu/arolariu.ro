/** @format */

import {Skeleton} from "@/components/ui/skeleton";

/**
 * A loading component.
 * @returns A loading component.
 */
export default async function Loading() {
  // TODO: add a loading sliding transition.
  // TODO: fix the loading skeleton.
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-4 px-5 py-24 text-center lg:flex-row lg:gap-8'>
      <section className='pb-10'>
        <div className='px-8 pb-10 sm:w-1/2'>
          <Skeleton className='h-[500px] w-[300px] object-cover' />
          <div>
            <Skeleton className='w-[208px] max-w-full' />
            <Skeleton className='w-[1960px] max-w-full' />
            <Skeleton className='w-[64px] max-w-full' />
          </div>
          <div className='mt-6 flex w-full border-0 px-5 py-2'>
            <Skeleton className='w-[64px] max-w-full' />
            <Skeleton className='w-[64px] max-w-full' />
            <Skeleton className='w-[64px] max-w-full' />
          </div>
        </div>
      </section>
    </main>
  );
}
