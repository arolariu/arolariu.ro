/**
 * @fileoverview Pure canonical taxonomy artifact names and repository paths.
 * @module scripts.common.taxonomy-artifacts
 */

import {join, resolve} from "node:path";
import type {TaxonomyArtifact} from "../types/generators.ts";

/** Canonical taxonomy artifact names shared by generation and verification tooling. */
export const taxonomyArtifactFileNames: Readonly<{
  gpc: string;
  ecoicop: string;
  nace: string;
}> = {
  gpc: "gpc-2026-05.min.json",
  ecoicop: "ecoicop-v2.min.json",
  nace: "nace-2.1.min.json",
};

/** Publisher metadata pinned with the checked-in artifact names. */
export type TaxonomyArtifactIdentity = Readonly<Pick<TaxonomyArtifact, "system" | "version" | "sourceUrl" | "attribution">>;

const publicationsOffice = "https://publications.europa.eu/webapi/rdf/sparql";
const europeanAttribution = "European Union, Publications Office of the European Union, reused under the European Commission reuse policy.";

/** Expected provenance for the three API and Website snapshots. */
export const taxonomyArtifactIdentities = {
  gpc: {
    system: "GS1_GPC",
    version: "2026-05",
    sourceUrl: "https://ref.gs1.org/standards/gpc/2026-05/",
    attribution: "GS1 Global Product Classification (GPC), May 2026 release.",
  },
  ecoicop: {
    system: "ECOICOP_V2",
    version: "2",
    sourceUrl: `${publicationsOffice}#http://data.europa.eu/ed1/ecoicop2/ecoicop2`,
    attribution: europeanAttribution,
  },
  nace: {
    system: "NACE_2_1",
    version: "2.1",
    sourceUrl: `${publicationsOffice}#http://data.europa.eu/ux2/nace2.1/nace2.1`,
    attribution: europeanAttribution,
  },
} as const satisfies Record<keyof typeof taxonomyArtifactFileNames, TaxonomyArtifactIdentity>;

/** Canonical repository-relative roots that receive mirrored taxonomy artifacts. */
export const taxonomyArtifactOutputRoots = [
  join("sites", "api.arolariu.ro", "src", "Invoices", "Resources", "Taxonomies"),
  join("sites", "arolariu.ro", "src", "data", "taxonomies"),
] as const;

/**
 * Returns every canonical taxonomy artifact path for a repository workspace.
 *
 * @param workspaceRoot - Absolute or relative monorepository root.
 * @returns Generator-major paths for the API and website mirrors.
 */
export function getExpectedTaxonomyArtifactPaths(workspaceRoot: string): readonly string[] {
  const outputRoots = taxonomyArtifactOutputRoots.map((root) => resolve(workspaceRoot, root));
  return [taxonomyArtifactFileNames.gpc, taxonomyArtifactFileNames.ecoicop, taxonomyArtifactFileNames.nace].flatMap((fileName) =>
    outputRoots.map((root) => join(root, fileName)),
  );
}
