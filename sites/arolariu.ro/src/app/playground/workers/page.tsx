/**
 * @fileoverview Worker playground entry route — dev-only.
 * @module app/playground/workers/page
 *
 * @remarks
 * Gated at the route level so Next.js returns 404 outside of development /
 * staging environments. All UI strings here (and on the rendered island)
 * are hardcoded English because the page is never reachable in production
 * and routing them through `next-intl` would only pollute the message
 * catalogs.
 */

import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale} from "next-intl/server";
import {notFound} from "next/navigation";

import {WorkerPlaygroundIsland} from "./island";

/**
 * Build localized-but-hardcoded metadata for the playground. Title is a
 * literal because this route is dev-only.
 *
 * @returns Metadata for the gated dev-only worker playground route.
 */
export async function generateMetadata(): Promise<Metadata> {
  return createMetadata({
    locale: await getLocale(),
    title: "Worker Playground",
    robots: "noindex",
  });
}

/**
 * Returns 404 in production. In dev/staging, renders the interactive island.
 *
 * @remarks
 * Gated at the route level so Next.js can tree-shake the route entirely under
 * the right NODE_ENV/SITE_ENV.
 */
export default async function WorkerPlaygroundPage(): Promise<React.JSX.Element> {
  const isDev = process.env["NODE_ENV"] === "development";
  const siteEnv = process.env["SITE_ENV"];
  const allowedSiteEnvs = ["DEV", "STAGING"];
  if (!isDev && (siteEnv === undefined || !allowedSiteEnvs.includes(siteEnv))) {
    notFound();
  }
  return <WorkerPlaygroundIsland />;
}
