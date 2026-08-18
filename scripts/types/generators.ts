/**
 * @fileoverview Shared contracts for taxonomy and license artifact generation.
 * @module scripts.types.generators
 */

/** Classification systems represented by generated taxonomy artifacts. */
export type ArtifactClassificationSystem = "GS1_GPC" | "ECOICOP_V2" | "NACE_2_1";

/** Single normalized taxonomy node. */
export interface TaxonomyArtifactNode {
  /** Stable code assigned by the official classification system. */
  readonly code: string;

  /** Official English label published for the classification code. */
  readonly officialLabel: string;

  /** Human-readable hierarchy level such as segment, class, or division. */
  readonly level: string;

  /** Immediate parent code, or `null` for a root classification node. */
  readonly parentCode: string | null;

  /** Ordered root-to-node sequence of classification codes. */
  readonly hierarchyCodes: readonly string[];

  /** Ordered root-to-node sequence of official labels. */
  readonly hierarchyLabels: readonly string[];

  /** Official definition when supplied by the source taxonomy. */
  readonly definition: string | null;

  /** Accent-insensitive normalized text used by runtime search. */
  readonly searchText: string;
}

/**
 * Versioned taxonomy artifact consumed by the API and website.
 *
 * @remarks
 * API and website copies are serialized from the same object and must remain
 * byte-identical.
 *
 * @example
 * ```typescript
 * const artifact: TaxonomyArtifact = {
 *   system: "NACE_2_1",
 *   version: "2.1",
 *   sourceUrl: "https://example.test/nace",
 *   generatedAt: new Date().toISOString(),
 *   attribution: "European Union",
 *   nodes: [],
 * };
 * ```
 */
export interface TaxonomyArtifact {
  /** Classification system represented by the artifact. */
  readonly system: ArtifactClassificationSystem;

  /** Official taxonomy version encoded by the artifact. */
  readonly version: string;

  /** Authoritative source URL used to generate the artifact. */
  readonly sourceUrl: string;

  /** ISO timestamp recording when generation occurred. */
  readonly generatedAt: string;

  /** Required source attribution included with the generated data. */
  readonly attribution: string;

  /** Normalized classification nodes in deterministic order. */
  readonly nodes: readonly TaxonomyArtifactNode[];
}

/** Dependency group used by frontend license generation. */
export type NodePackageDependencyType = "production" | "development" | "peer";

/**
 * Installed package metadata written to the frontend license document.
 *
 * @remarks
 * Values are normalized from direct installed package manifests. Missing
 * optional metadata uses explicit human-readable defaults.
 *
 * @example
 * ```typescript
 * const packageInformation: NodePackageInformation = {
 *   name: "react",
 *   version: "19.2.8",
 *   description: "React is a JavaScript library for building user interfaces.",
 *   homepage: "https://react.dev",
 *   license: "MIT",
 *   author: "Meta",
 *   dependents: [],
 * };
 * ```
 */
export interface NodePackageInformation {
  /** Installed npm package name, including scope when applicable. */
  readonly name: string;

  /** Exact installed package version. */
  readonly version: string;

  /** Human-readable package description. */
  readonly description: string;

  /** Project homepage or repository URL. */
  readonly homepage: string;

  /** SPDX license identifier or normalized fallback value. */
  readonly license: string;

  /** Package author or maintainer name. */
  readonly author: string;

  /** Direct dependency declarations published by the installed package. */
  readonly dependents?: readonly Readonly<{
    /** Declared dependency package name. */
    name: string;

    /** Declared dependency version range. */
    version: string;
  }>[];
}
