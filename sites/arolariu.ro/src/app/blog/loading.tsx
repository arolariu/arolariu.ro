/** @format */

/**
 * The loading component.
 * @returns The loading component.
 */
export default async function Loading() {
  return (
    <div className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-4 px-5 py-24 text-center lg:flex-row lg:gap-8'>
      <h1 className='text-4xl font-bold text-gray-800'>Loading...</h1>
    </div>
  );
}
