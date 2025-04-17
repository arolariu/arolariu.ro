/** @format */

import {User} from "@clerk/nextjs/server";

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
  sizeInBytes: number;
  dependents?: NodePackageDependencyDependsOn[];
};

/**
 * The type of the JSON object that encapsulates the information about node packages.
 * The information is separated by the type of dependency - production, development, or peer.
 * Each dependency type has an array of node package information objects.
 */
export type NodePackagesJSON = {[depType in NodePackageDependencyType]?: NodePackageInformation[]};

/**
 * The status of an upload.
 */
export type UploadStatus =
  | "UNKNOWN"
  | "PENDING__CLIENTSIDE" // The upload is pending on the client-side.
  | "PENDING__SERVERSIDE" // The upload is pending on the server-side.
  | "SUCCESS__CLIENTSIDE" // The upload was successful on the client-side.
  | "SUCCESS__SERVERSIDE" // The upload was successful on the server-side.
  | "FAILURE__CLIENTSIDE" // The upload failed on the client-side.
  | "FAILURE__SERVERSIDE"; // The upload failed on the server-side.

export type UserInformation = {
  user: User | null;
  userIdentifier: string;
  userJwt: string;
};

/**
 * The type of the object that represents information about a navigation item.
 */
export type NavigationItem = {
  label: string;
  href: string;
  children?: NavigationItem[];
};
