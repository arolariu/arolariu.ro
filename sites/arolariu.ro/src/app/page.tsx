import FeaturesList from "@/components/Features/FeaturesList";
import Link from "next/link";

/**
 * The home page component.
 * @returns The home page component.
 */
export default async function Home() {
  return (
    <main>
      <section className='py-12 sm:pb-16 lg:pb-20 xl:pb-24'>
        <div className='relative mx-auto max-w-full px-4 sm:px-6 lg:px-8 2xl:max-w-[120rem]'>
          <div>
            <h1 className='mt-6 text-4xl font-normal text-white 2xsm:text-center sm:mt-10 sm:text-5xl md:text-left lg:text-6xl xl:text-8xl'>
              <span className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-transparent'>
                Welcome to <span className='font-bold'>arolariu.ro</span>
              </span>
            </h1>
            <p className='mt-4 max-w-lg text-xl text-gray-500 2xsm:text-center md:text-left lg:max-w-2xl'>
              This platform was built by Alexandru-Razvan Olariu as a playground for new technologies. The platform is
              built using state-of-the-art, enterprise-grade technologies. <br /> <br />
              You are welcome to explore all of the applications and services that are hosted on this domain space.
            </p>
            <div className='relative mt-8 inline-flex 2xsm:ml-[26%] md:ml-0'>
              <div className='absolute -inset-px rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-200 group-hover:shadow-lg group-hover:shadow-cyan-500/50' />
              <Link
                href='/domains'
                title=''
                className='relative inline-flex rounded-full border border-transparent bg-black px-8 py-3 text-white'>
                Start Exploring
              </Link>
            </div>

            <div>
              <div className='mt-8 inline-flex items-center border-t border-gray-800 pt-6 dark:border-gray-300'>
                <svg
                  className='h-6 w-6'
                  viewBox='0 0 24 24'
                  fill='none'
                  strokeWidth='1.5'
                  xmlns='http://www.w3.org/2000/svg'>
                  <path
                    d='M13 7.00003H21M21 7.00003V15M21 7.00003L13 15L9 11L3 17'
                    stroke='url(#a)'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  />
                </svg>

                <span className='2xsm:text-center md:text-left'>THANK YOU FOR THE TIME SPENT ON THE WEBSITE.</span>
              </div>
            </div>
          </div>
        </div>
      </section>{" "}
      {/* Hero section */}
      <section className='py-12 sm:pb-16 lg:pb-20 xl:pb-24'>
        <FeaturesList />
      </section>{" "}
      {/* Features section */}
    </main>
  );
}
