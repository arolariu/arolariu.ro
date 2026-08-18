/**
 * @fileoverview Shared contracts for taxonomy and license artifact generation.
 * @module scripts.types.generators
 */

/** Classification systems represented by generated taxonomy artifacts. */
export type ArtifactClassificationSystem = "GS1_GPC" | "ECOICOP_V2" | "NACE_2_1";

/** Single normalized taxonomy node. */
export interface TaxonomyArtifactNode {
  readonly code: string;
  readonly officialLabel: string;
  readonly level: string;
  readonly parentCode: string | null;
  readonly hierarchyCodes: readonly string[];
  readonly hierarchyLabels: readonly string[];
  readonly definition: string | null;
  readonly searchText: string;
}

/** Versioned taxonomy artifact consumed by the API and website. */
export interface TaxonomyArtifact {
  readonly system: ArtifactClassificationSystem;
  readonly version: string;
  readonly sourceUrl: string;
  readonly generatedAt: string;
  readonly attribution: string;
  readonly nodes: readonly TaxonomyArtifactNode[];
}

/** Dependency group used by frontend license generation. */
export type NodePackageDependencyType = "production" | "development" | "peer";

/** Installed package metadata written to the frontend license document. */
export interface NodePackageInformation {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly homepage: string;
  readonly license: string;
  readonly author: string;
  readonly dependents?: readonly Readonly<{name: string; version: string}>[];
}
