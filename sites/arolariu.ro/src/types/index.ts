import type {User} from "@clerk/nextjs/server";
import type {Route} from "next";
export type {
  SecretEnvironmentVariablesType,
  TypedDevelopmentEnvironmentVariablesType,
  TypedEnvironment,
  TypedProductionEnvironmentVariablesType,
} from "./typedEnv";

/**
 * The type of a node package.
 */
export type NodePackageDependencyType = Readonly<"production" | "development" | "peer">;

/**
 * A short name-version pair of a node package, that is mostly used for dependencies of dependencies.
 * This is used to show the dependents of a package.
 */
export type NodePackageDependencyDependsOn = Readonly<{name: string; version: string}>;

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

/**
 * The status of an upload operation.
 * This is used to track the status of an upload operation.
 */
export type UploadStatus =
  | "UNKNOWN"
  | "PENDING__CLIENTSIDE" // The upload is pending on the client-side.
  | "PENDING__SERVERSIDE" // The upload is pending on the server-side.
  | "SUCCESS__CLIENTSIDE" // The upload was successful on the client-side.
  | "SUCCESS__SERVERSIDE" // The upload was successful on the server-side.
  | "FAILURE__CLIENTSIDE" // The upload failed on the client-side.
  | "FAILURE__SERVERSIDE"; // The upload failed on the server-side.

/**
 * The type of the object that represents information about a user.
 */
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
  href: Route;
  children?: NavigationItem[];
};

export type NavigatorKeys = keyof globalThis.Navigator;
export type NavigatorValues = globalThis.Navigator[NavigatorKeys];
export type ScreenKeys = keyof globalThis.Screen;
export type ScreenValues = Omit<globalThis.Screen[ScreenKeys], "orientation">;

export type BrowserInformation = {
  navigationInformation: Partial<Record<NavigatorKeys, NavigatorValues>>;
  screenInformation: Partial<Record<ScreenKeys, ScreenValues>>;
};
