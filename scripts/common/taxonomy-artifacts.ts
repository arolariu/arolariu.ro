/**
 * @fileoverview Pure canonical taxonomy artifact names and repository paths.
 * @module scripts.common.taxonomy-artifacts
 */

import {join, resolve} from "node:path";

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
