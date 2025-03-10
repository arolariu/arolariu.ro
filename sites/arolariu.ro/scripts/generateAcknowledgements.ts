/** @format */

import type {NodePackageDependencyDependsOn, NodePackageDependencyType, NodePackageInformation} from "@/types";
import {globSync} from "glob";
import fs from "node:fs";
import path from "node:path";
import {EOL} from "os";

function generateAcknowledgements(verbose: boolean = false) {
  console.log("[arolariu::acknowledgments] >>> Generating the `licenses.json` file...");
  const specifiedPackages = extractDependenciesFromRootManifest(verbose);

  const allInstalledPackages = extractDependenciesManifestPaths(verbose);
  const filteredPackages = filterDependenciesManifestPathsWithDependenciesList(allInstalledPackages, specifiedPackages);

  const packageManifests = buildPackageManifests(filteredPackages, specifiedPackages);
  writeJsonFileWithManifests(packageManifests);
  console.info("[arolariu::acknowledgments] >>> The `licenses.json` file has been generated successfully.");
}

/**
 * This function writes the package manifests to a JSON file.
 * @param packageManifests The map of package manifests.
 */
function writeJsonFileWithManifests(packageManifests: Map<NodePackageDependencyType, NodePackageInformation[]>) {
  const rootPath = path.resolve(process.cwd()).concat("/licenses.json").replace(/\\/g, "/");

  // sort packages in each dependency type
  const sortedPackages = new Map<NodePackageDependencyType, NodePackageInformation[]>();
  for (const [depType, packages] of packageManifests) {
    const sortedPackagesArray = packages.toSorted((a, b) => a.name.localeCompare(b.name));
    sortedPackages.set(depType, sortedPackagesArray);
  }

  console.log("[arolariu::acknowledgments] >>> Writing licenses.json file to ", rootPath);
  console.info("[arolariu::acknowledgments] >>> Exact path:", path.dirname(rootPath));

  const fileContent = JSON.stringify(Object.fromEntries(sortedPackages), null, 0);
  fs.mkdirSync(path.dirname(rootPath), {recursive: true});
  fs.writeFileSync(rootPath, fileContent + EOL, "utf-8");

  console.info("[arolariu::acknowledgments] >>> Finished writing licenses.json file.");
}

/**
 * This function walks through the package.json files and builds a map of package manifests.
 * @param packageDirectPaths The paths to the package.json files.
 * @param specifiedPackages The dependencies specified in the root package.json file.
 * @returns A map of package manifests.
 */
function buildPackageManifests(
  packageDirectPaths: string[],
  specifiedPackages: Map<NodePackageDependencyType, string[]>,
): Map<NodePackageDependencyType, NodePackageInformation[]> {
  const packageManifests = new Map<NodePackageDependencyType, NodePackageInformation[]>();
  try {
    for (const packagePath of packageDirectPaths) {
      const packageManifest: {
        name?: string;
        author?: string | {name: string};
        description?: string;
        homepage?: string;
        version?: string;
        license?: string;
        repository?: string | {url: string};
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      } = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

      if (packageManifest.name === undefined) packageManifest.name = path.basename(path.dirname(packagePath)).replace(/\\/g, "/");
      if (packageManifest.author === undefined) packageManifest.author = "unknown";
      if (typeof packageManifest.author === "object") packageManifest.author = packageManifest.author.name;
      if (packageManifest.description === undefined) packageManifest.description = "This package has not provided a valid description.";

      if (packageManifest.version === undefined) packageManifest.version = "unknown";

      if (packageManifest.homepage === undefined && typeof packageManifest.repository === "string")
        packageManifest.homepage = packageManifest.repository;
      if (packageManifest.homepage === undefined && typeof packageManifest.repository === "object")
        packageManifest.homepage = packageManifest.repository.url;

      // determine the dependency type
      let depType: NodePackageDependencyType = "peer";
      const productionPackages = specifiedPackages.get("production") ?? [];
      const developmentPackages = specifiedPackages.get("development") ?? [];

      if (productionPackages.includes(packageManifest.name)) {
        depType = "production";
      } else if (developmentPackages.includes(packageManifest.name)) {
        depType = "development";
      }

      // compute dependents of package:
      const pkgDependents: NodePackageDependencyDependsOn[] = [];
      const combinedDependents = {
        ...packageManifest.dependencies,
        ...packageManifest.devDependencies,
        ...packageManifest.peerDependencies,
      };

      for (const [name, version] of Object.entries(combinedDependents)) {
        pkgDependents.push({name, version});
      }

      const pkg: NodePackageInformation = {
        name: packageManifest.name,
        author: packageManifest.author,
        description: packageManifest.description,
        homepage: packageManifest.homepage ?? "unknown",
        license: packageManifest.license ?? "unknown",
        version: packageManifest.version,
        dependents: pkgDependents,
      } satisfies NodePackageInformation;

      if (packageManifests.has(depType)) packageManifests.get(depType)?.push(pkg);
      else packageManifests.set(depType, [pkg]);
    }
  } catch (err) {
    console.error("[arolariu::acknowledgments] >>> Error reading package.json file:", err);
  }

  return packageManifests;
}

/**
 * This function will take all of the package.json file paths available in the node_modules directory.
 * It will filter out the package paths for packages that are not specified in the root package.json file.
 * @param packageDirectPaths All the package.json file paths in the node_modules directory.
 * @param specifiedPackages The dependencies specified in the root package.json file.
 * @returns An array of package.json file paths that are specified in the root package.json file.
 */
function filterDependenciesManifestPathsWithDependenciesList(
  packageDirectPaths: string[],
  specifiedPackages: Map<NodePackageDependencyType, string[]>,
): string[] {
  console.info("[arolariu::acknowledgments] >>> Processing ", packageDirectPaths.length, " manifest files in node_modules...");

  const filteredPackagePaths = packageDirectPaths.filter((packagePath) => {
    // Filter 1: name filter (process only specified packages)
    const packageName = JSON.parse(fs.readFileSync(packagePath, "utf-8")).name;

    // Filter 2: path filter (avoid packages from nested node_modules)
    const pathParts = packagePath.match(/node_modules/g);
    if (pathParts === null || pathParts.length >= 2) return false;

    return (
      specifiedPackages.get("production")?.includes(packageName) ||
      specifiedPackages.get("development")?.includes(packageName) ||
      specifiedPackages.get("peer")?.includes(packageName)
    );
  });

  // convert to absolute paths
  filteredPackagePaths.forEach((packagePath) => path.resolve(packagePath).replace(/\\/g, "/"));

  console.info(
    "[arolariu::acknowledgments] >>> After filtering node_modules folder, found ",
    filteredPackagePaths.length,
    " packages, from " + packageDirectPaths.length + " manifest files.",
  );

  return filteredPackagePaths;
}

/**
 * This function recursively searches for all the package.json files in the node_modules directory.
 * It returns an array of all possible paths to any package.json files.
 * @returns An array of paths to the package.json files.
 */
function extractDependenciesManifestPaths(verbose: boolean = false): string[] {
  let pathToNodeModules = process.cwd();
  pathToNodeModules = path.resolve(pathToNodeModules, "node_modules");
  pathToNodeModules = pathToNodeModules.replace(/\\/g, "/");
  console.info("[arolariu::acknowledgments] >>> Identified path to node_modules:", pathToNodeModules);

  let packageRawPaths = globSync(pathToNodeModules, {ignore: "**/node_modules/**/node_modules/**"});
  let packageDirectPaths: string[] = []; // this will contain direct paths to the package.json files
  for (const path of packageRawPaths) packageDirectPaths.push(...globSync(`${path}/**/package.json`));
  verbose && console.info("[arolariu::acknowledgments] >>> Found ", packageDirectPaths.length, " package.json files.");

  return packageDirectPaths;
}

/**
 * Function that reads the main package.json file and extracts the dependencies (prod, dev, peer) from it.
 * The dependencies are stored in a Map<depType,string> and then returned.
 * @returns A Map<depType, string[]> containing the dependencies.
 */
function extractDependenciesFromRootManifest(verbose: boolean = false): Map<NodePackageDependencyType, string[]> {
  const currentDirectory = process.cwd();
  console.info("[arolariu::acknowledgments] >>> Current directory:", currentDirectory);

  let packageManifestPath = currentDirectory.concat("/package.json").replace(/\\/g, "/");
  console.log("[arolariu::acknowledgments] >>> Reading current package.json file from ", packageManifestPath);
  const packageManifest = JSON.parse(fs.readFileSync(packageManifestPath, "utf-8"));
  verbose && console.info("[arolariu::acknowledgments] >>> Package.json content:", packageManifest);

  const productionPackages = Object.keys(packageManifest.dependencies ?? {});
  const developmentPackages = Object.keys(packageManifest.devDependencies ?? {});
  const peerPackages = Object.keys(packageManifest.peerDependencies ?? {});

  const specifiedPackages = new Map<NodePackageDependencyType, string[]>(); // this will contain the dependencies
  specifiedPackages.set("production", productionPackages);
  specifiedPackages.set("development", developmentPackages);
  specifiedPackages.set("peer", peerPackages);

  const totalNumberOfPackages = productionPackages.length + developmentPackages.length + peerPackages.length;
  console.info("[arolariu::acknowledgments] >>> Found ", totalNumberOfPackages, " unique packages in package.json.");
  console.info("[arolariu::acknowledgments] >>> Production packages: ", productionPackages.length);
  console.info("[arolariu::acknowledgments] >>> Development packages: ", developmentPackages.length);
  console.info("[arolariu::acknowledgments] >>> Peer packages: ", peerPackages.length);

  return specifiedPackages;
}

/**
 * This function will be the entry point of the script.
 */
export async function main(verbose: boolean = false) {
  generateAcknowledgements(verbose);
}

main();
