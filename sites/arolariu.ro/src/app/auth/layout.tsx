import {Suspense} from "react";
import Loading from "./loading";

/**
 * Layout for authentication pages.
 *
 * @remarks
 * **Rendering Context**: Server Component layout with client component children.
 *
 * **Visual Features**:
 * Background effects (Three.js 3D scene, particles, beams) are rendered
 * in the client island component to avoid RSC hydration issues.
 *
 * **Accessibility**:
 * - Content remains fully accessible
 * - Reduced motion preferences respected in child components
 *
 * @param props - Layout properties with children
 *
 * @returns The authentication layout
 */
export default async function AuthRootLayout(props: Readonly<LayoutProps<"/auth">>): Promise<React.JSX.Element> {
  return (
    <main className='relative min-h-screen w-full overflow-hidden'>
      {/* Content layer with Suspense boundary */}
      <div className='relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24'>
        <Suspense fallback={<Loading />}>{props.children}</Suspense>
      </div>
    </main>
  );
}
