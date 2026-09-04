/**
 * @fileoverview Tier validation, landing pages, and prose mirroring for the documentation site.
 * Once every extractor family finishes, the generated tree still has to become a site: each
 * required tier must hold extracted content, each tier root needs the `index.md` Docusaurus serves
 * at its plugin's `routeBasePath`, and `/docs/` prose has to be mirrored into the Docusaurus source
 * tree. `scripts/features/documentation/workflow.ts` decides when these run and how failures type.
 * @module scripts/features/documentation/assembly
 */

import {join} from "node:path";

import type {DirectoryEntry, FileSystem} from "../../core/runtime/runtime-capability.ts";
import {serializeFrontmatter} from "./normalize.ts";

/**
 * Required generated tiers mounted by Docusaurus, relative to `_generated/`. Each must hold at
 * least one extractor-produced file; root landing files are ignored so synthetic Docusaurus pages
 * cannot satisfy the deployment gate.
 */
const requiredDocumentationTiers = [
  {relativePath: join("ts-reference", "components"), label: "typedoc components"},
  {relativePath: join("ts-reference", "website"), label: "typedoc website"},
  {relativePath: "experimental", label: "pydoc-markdown"},
  {relativePath: "dotnet-internals", label: "defaultdocumentation"},
] as const;

/**
 * Platform-stable, POSIX-separated identity of every {@link requiredDocumentationTiers} entry, in
 * the same fixed order; the workflow reports these instead of host-separated `relativePath` values.
 */
export const generatedDocumentationTierIdentities: readonly string[] = [
  "ts-reference/components",
  "ts-reference/website",
  "experimental",
  "dotnet-internals",
];

const rootLandingFileNames = new Set(["index.md", "index.mdx", "readme.md", "readme.mdx"]);
const isDocumentationOutputFile = (fileName: string): boolean => /\.mdx?$|\.json$/i.test(fileName);

/** Thrown when a required tier is missing or holds only synthetic landing files. */
export class DocumentationTierError extends Error {
  /** Human-readable tier label, for example `typedoc website`. */
  public readonly tierLabel: string;
  /** Absolute path to the tier root that failed validation. */
  public readonly tierPath: string;

  /** @param message - The verbatim message this failure reports. */
  public constructor(tierLabel: string, tierPath: string, message: string) {
    super(message);
    this.name = "DocumentationTierError";
    this.tierLabel = tierLabel;
    this.tierPath = tierPath;
  }
}

async function countExtractorOutputFiles(files: FileSystem, dir: string, isRoot: boolean = true): Promise<number> {
  let count = 0;
  for (const entry of await files.readDirectory(dir)) {
    if (entry.kind === "directory") count += await countExtractorOutputFiles(files, join(dir, entry.name), false);
    else if (isDocumentationOutputFile(entry.name) && !(isRoot && rootLandingFileNames.has(entry.name.toLowerCase()))) count++;
  }
  return count;
}

/**
 * Verifies that every tier mounted by Docusaurus contains extractor output under `generatedRoot`.
 *
 * @throws {DocumentationTierError} When a tier is missing or holds only landing files.
 */
export async function assertExpectedDocumentationTiers(files: FileSystem, generatedRoot: string): Promise<void> {
  for (const tier of requiredDocumentationTiers) {
    const tierRoot = join(generatedRoot, tier.relativePath);
    if (!(await files.exists(tierRoot))) {
      throw new DocumentationTierError(tier.label, tierRoot, `${tier.label}: expected directory not found at ${tierRoot}`);
    }
    if ((await countExtractorOutputFiles(files, tierRoot)) === 0) {
      throw new DocumentationTierError(tier.label, tierRoot, `${tier.label}: extracted 0 non-landing files into ${tierRoot}`);
    }
  }
}

/** Absolute tier roots the landing-page writer generates an `index.md` for. */
export interface DocumentationTierDirectories {
  /** Absolute path to `_generated/ts-reference/`. */
  readonly tsReferenceDirectory: string;
  /** Absolute path to `_generated/experimental/`. */
  readonly pythonDirectory: string;
  /** Absolute path to `_generated/dotnet-internals/`. */
  readonly dotnetInternalsDirectory: string;
}

const landingPageBullet = (entry: Readonly<DirectoryEntry>, routeBase: string): string => {
  const label = entry.name.replace(/\.mdx?$/i, "");
  return `- [${label}](${routeBase}/${label}${entry.kind === "directory" ? "/" : ""})`;
};

/**
 * Generates one tier's `index.md`, listing each immediate child so visitors can browse. Without it
 * Docusaurus has no page at the plugin's `routeBasePath` and every navbar link to that tier 404s.
 * Frontmatter goes through `serializeFrontmatter`, so a title holding YAML-reserved characters is
 * quoted exactly the way extractor output is.
 */
async function writeLandingPage(
  files: FileSystem,
  page: Readonly<{dir: string; title: string; summary: string; routeBase: string}>,
): Promise<void> {
  if (!(await files.exists(page.dir))) return;
  const bullets = (await files.readDirectory(page.dir))
    .filter((entry) => entry.kind === "directory" || /\.mdx?$/i.test(entry.name))
    .filter((entry) => !/^index\.mdx?$/i.test(entry.name))
    .toSorted((left, right) => left.name.localeCompare(right.name))
    .map((entry) => landingPageBullet(entry, page.routeBase))
    .join("\n");
  const body = `\n# ${page.title}\n\n${page.summary}\n\n${bullets}\n`;
  await files.writeText(join(page.dir, "index.md"), serializeFrontmatter({title: page.title, sidebar_position: 0}, body));
}

/** Writes every tier's landing page, after normalization so each appears in its sidebar at `0`. */
export async function writeDocumentationLandingPages(
  files: FileSystem,
  directories: Readonly<DocumentationTierDirectories>,
): Promise<void> {
  const pages = [
    {
      dir: directories.tsReferenceDirectory,
      title: "TypeScript reference",
      summary: "Generated from TSDoc / JSDoc comments across `@arolariu/components` and the `arolariu.ro` website.",
      routeBase: "/reference/typescript",
    },
    {
      dir: directories.pythonDirectory,
      title: "Experimental service (Python)",
      summary:
        "Internal documentation for `exp.arolariu.ro`, a FastAPI configuration-proxy service. Extracted from Google-style docstrings via `pydoc-markdown`.",
      routeBase: "/internals/experimental",
    },
    {
      dir: directories.dotnetInternalsDirectory,
      title: ".NET internals",
      summary:
        "Reference documentation for internal types, services, and brokers of `api.arolariu.ro`. Generated from XML doc comments via `DefaultDocumentation`.",
      routeBase: "/internals/dotnet",
    },
  ] as const;
  for (const page of pages) await writeLandingPage(files, page);
}

/**
 * Mirrors `src` prose into `dest`, wiping the destination first so stale files never survive a
 * rename. The `superpowers/` subtree is excluded because it holds gitignored per-author planning
 * documents that must never reach the published site.
 */
export async function syncProse(files: FileSystem, src: string, dest: string): Promise<void> {
  await files.remove(dest, {recursive: true, force: true});
  await files.createDirectory(dest, {recursive: true});
  await files.copy(src, dest, {recursive: true, force: true});
  await files.remove(join(dest, "superpowers"), {recursive: true, force: true});
}
