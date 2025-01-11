/** @format */

import type {Metadata} from "next";
import RenderDomainsScreen from "./island";

export const metadata: Metadata = {
  title: "Domain Space Services",
  description:
    "Domain Space Services are services that are offered to visitors and members of the `arolariu.ro` domain space",
};

/**
 * The domains homepage.
 * @returns The domains homepage.
 */
export default async function DomainsHomepage() {
  return <RenderDomainsScreen />;
}
