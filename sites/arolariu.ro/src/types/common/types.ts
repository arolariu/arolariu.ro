/** @format */

/**
 * The type of a node package.
 */
export type NodePackageDependencyType = "production" | "development" | "peer";

/**
 * A short name-version pair of a node package, that is mostly used for dependencies of dependencies.
 * This is used to show the dependents of a package.
 */
export type NodePackageDependencyDependsOn = {name: string; version: string};

/**
 * The type of the object that represents the information about a node package.
 */
export type NodePackageInformation = {
  name: string;
  version: string;
  description: string;
  homepage: string;
  license: string;
  author: string;
  dependents?: NodePackageDependencyDependsOn[];
};

/**
 * The type of the JSON object that encapsulates the information about node packages.
 * The information is separated by the type of dependency - production, development, or peer.
 * Each dependency type has an array of node package information objects.
 */
export type NodePackagesJSON = {[depType in NodePackageDependencyType]?: NodePackageInformation[]};
