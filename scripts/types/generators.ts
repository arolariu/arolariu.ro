/**
 * @fileoverview Shared contracts for license artifact generation.
 * @module scripts.types.generators
 */

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
