import {Suspense} from "react";
import Loading from "./loading";

/**
 * The layout for the invoices pages.
 * @returns The layout for the invoices pages.
 */
export default async function InvoicesRootLayout(props: Readonly<LayoutProps<"/domains/invoices">>): Promise<React.JSX.Element> {
  return <Suspense fallback={<Loading />}>{props.children}</Suspense>;
}
