/** @format */

import {Skeleton} from "@/components/ui/skeleton";

/**
 * This function renders the loading screen for the invoices domain.
 * @returns The loading screen for the invoices domain.
 */
export default function Loading() {
  return (
    <section>
      <div className='container mx-auto flex flex-col items-center justify-center px-5 py-24'>
        <Skeleton className='h-[500px] w-[500px] object-cover object-center' />
        <div className='mt-2 w-full lg:w-2/3'>
          <div className='mb-4 from-pink-400 bg-clip-text'>
            <Skeleton className='w-[456px] max-w-full' />
          </div>
          <div className='mb-8 leading-relaxed'>
            <Skeleton className='w-[1560px] max-w-full' />
          </div>
          <div className='flex justify-center'>
            <div className='inline-flex border-0 px-6 py-2'>
              <Skeleton className='w-[112px] max-w-full' />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
