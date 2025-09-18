"use client";
import {Skeleton} from "@arolariu/components";

/**
 * This function renders the loading screen for the auth pages.
 * @returns The loading screen for the auth pages.
 */
export default function Loading(): React.JSX.Element {
  return (
    <main>
      <div className='container mx-auto px-5 py-24'>
        <div className='mx-4 mb-10 flex flex-wrap'>
          <div className='container mb-10 px-8'>
            <div className='flex h-64 items-center justify-center'>
              <Skeleton className='h-[500px] w-[300px] object-cover' />
            </div>
            <div className='mt-6 mb-3'>
              <Skeleton className='w-[248px] max-w-full' />
            </div>
            <div className='leading-relaxed'>
              <Skeleton className='w-[1568px] max-w-full' />
            </div>
            <div className='mt-6 flex w-full border-0 px-5 py-2'>
              <Skeleton className='w-[64px] max-w-full' />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
