import {Suspense} from "react";
import Loading from "./loading";

/**
 * The layout for the about pages.
 * @returns The layout for the about pages.
 */
export default async function AboutRootLayout(props: Readonly<LayoutProps<"/about">>) {
  return <Suspense fallback={<Loading />}>{props.children}</Suspense>;
}
