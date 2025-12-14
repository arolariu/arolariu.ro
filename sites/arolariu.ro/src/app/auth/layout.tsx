import {BackgroundBeams} from "@arolariu/components/background-beams";
import {DotBackground} from "@arolariu/components/dot-background";
import {Suspense} from "react";
import Loading from "./loading";

/**
 * The layout for the authentication pages.
 * @returns The layout for the authentication pages.
 */
export default async function AuthRootLayout(props: Readonly<LayoutProps<"/auth">>): Promise<React.JSX.Element> {
  return (
    <main className='relative w-full overflow-hidden px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24'>
      <DotBackground
        glow
        className='opacity-40'
      />
      <BackgroundBeams className='opacity-60' />

      <div className='relative z-10 mx-auto w-full max-w-7xl'>
        <Suspense fallback={<Loading />}>{props.children}</Suspense>
      </div>
    </main>
  );
}
