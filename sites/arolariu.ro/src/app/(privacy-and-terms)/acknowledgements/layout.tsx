/** @format */

import {type ReactNode, Suspense} from "react";
import Loading from "./loading";

/**
 * The layout for the acknowledgements pages.
 * @returns The layout for the acknowledgements pages.
 */
export default async function AcknowledgementsLayout({children}: Readonly<{children: ReactNode}>): Promise<React.JSX.Element> {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}
