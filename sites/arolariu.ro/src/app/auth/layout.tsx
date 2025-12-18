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
  return <Suspense fallback={<Loading />}>{props.children}</Suspense>;
}
