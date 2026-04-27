/**
 * @fileoverview Worker playground entry route — dev-only.
 * @module app/playground/workers/page
 *
 * @remarks
 * Gated at the route level so Next.js returns 404 outside of development /
 * staging environments. Metadata is produced via the shared
 * `createMetadata` helper with i18n fall-through to literal English so
 * the playground works without locale-file edits.
 */

import {createMetadata} from "@/metadata";
import type {Metadata} from "next";
import {getLocale, getTranslations} from "next-intl/server";
import {notFound} from "next/navigation";

import {WorkerPlaygroundIsland} from "./island";

/**
 * Build localized metadata for the playground. Falls back to literal
 * English when translation keys are not present so a fresh checkout
 * works without `messages/*.json` edits.
 *
 * @returns Metadata for the gated dev-only worker playground route.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  const titleKey = "Playground.Workers.metadata.title";
  return createMetadata({
    locale: await getLocale(),
    title: t.has(titleKey) ? t(titleKey) : "Worker Playground",
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
