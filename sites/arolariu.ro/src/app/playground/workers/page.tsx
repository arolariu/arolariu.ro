/**
 * @fileoverview Worker playground entry route — dev-only.
 * @module app/playground/workers/page
 */

import {notFound} from "next/navigation";

import {WorkerPlaygroundIsland} from "./island";

export const metadata = {
  title: "Worker Playground",
  robots: "noindex",
};

/**
 * Returns 404 in production. In dev/staging, renders the interactive island.
 *
 * @remarks
 * Gated at the route level so Next.js can tree-shake the route entirely under
 * the right NODE_ENV/SITE_ENV.
 */
export default function WorkerPlaygroundPage(): React.JSX.Element {
  const isDev = process.env["NODE_ENV"] === "development";
  const siteEnv = process.env["SITE_ENV"];
  const allowedSiteEnvs = ["DEV", "STAGING"];
  if (!isDev && (siteEnv === undefined || !allowedSiteEnvs.includes(siteEnv))) {
    notFound();
  }
  return <WorkerPlaygroundIsland />;
}
