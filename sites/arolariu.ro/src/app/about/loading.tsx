/**
 * @fileoverview Loading UI for the /about route group.
 * @module app/about/loading
 *
 * @remarks
 * Defines a route-level loading fallback for the About section using
 * Skeleton placeholders from the shared component library.
 *
 * @see {@link https://nextjs.org/docs/app/building-your-application/routing/loading-ui}
 */

import {Skeleton} from "@arolariu/components/skeleton";

/**
 * Renders the loading skeletons for the About route group.
 *
 * @remarks
 * **Rendering Context**: Server Component (route segment loading UI).
 *
 * **Purpose**: Provides a consistent placeholder layout while nested About
 * pages stream and resolve their data and modules.
 *
 * **Design**: Uses multiple `Skeleton` blocks to approximate the final layout
 * without revealing content, improving perceived performance.
 *
 * @returns The About route loading UI with skeleton placeholders.
 *
 * @example
 * ```tsx
 * // Next.js renders this automatically during /about route loading
 * <Loading />
 * ```
 */
export default function Loading(): React.JSX.Element {
  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center pt-24 text-center'>
      <section>
        <center className='container mx-auto px-5 pt-24'>
          <Skeleton className='h-[20px] w-[250px] rounded-xl' />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
          <br />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
        </center>
      </section>
      <section className='mb-16 flex flex-row flex-wrap items-center justify-center justify-items-center pb-16 text-center'>
        <main className='gap-4 p-8'>
          <Skeleton className='h-[500px] w-[650px] rounded-xl' />
          <Skeleton className='h-[20px] w-[250px] rounded-xl' />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
          <br />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
        </main>
        <main className='gap-4 p-8'>
          <Skeleton className='h-[500px] w-[650px] rounded-xl' />
          <Skeleton className='h-[20px] w-[250px] rounded-xl' />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
          <br />
          <Skeleton className='h-[12px] w-[100px] rounded-xl' />
        </main>
      </section>
    </main>
  );
}
