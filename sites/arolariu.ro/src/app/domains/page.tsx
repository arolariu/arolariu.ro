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
 * This is the main page for the domain space services.
 * This page hosts the domain space services.
 * @returns The domains homepage SSR'ed component.
 */
export default async function DomainsHomepage() {
  return <RenderDomainsScreen />;
}
