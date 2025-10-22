import {Suspense} from "react";
import Loading from "./loading";

/**
 * The layout for the acknowledgements pages.
 * @returns The layout for the acknowledgements pages.
 */
export default async function AcknowledgementsLayout(props: Readonly<LayoutProps<"/acknowledgements">>): Promise<React.JSX.Element> {
  return <Suspense fallback={<Loading />}>{props.children}</Suspense>;
}
