/** @format */

import fs from "fs";
import {globSync} from "glob";
import {exit} from "node:process";
import {EOL} from "os";
import path from "path";

interface Package {
  name: string;
  author: string;
  description: string;
  homepage: string;
  version: string;
  license: string;
}

export async function generateAcknowledgments(): Promise<void> {
  console.log("Generating the `licenses.json` file...");
  const specifiedPackages = extractDependenciesFromRootManifest();

  let packageDirectPaths: string[] = extractDependenciesManifestPaths();
  packageDirectPaths = filterDependenciesManifestPathsWithDependenciesList(packageDirectPaths, specifiedPackages);

  const packageManifests = buildPackageManifests(packageDirectPaths);
  writeJsonFileWithManifests(packageManifests);
  console.info("The `licenses.json` file has been generated successfully.");
}

function writeJsonFileWithManifests(packageManifests: Map<string, Package>) {
  const rootPath = path.resolve(process.cwd()).concat("/licenses.json").replace(/\\/g, "/");
  const sortedPackages = Array.from(packageManifests.values()).sort((a, b) => a.name.localeCompare(b.name));

  console.log("Writing licenses.json file to ", rootPath);
  console.info("Exact path:", path.dirname(rootPath));

  fs.mkdirSync(path.dirname(rootPath), {recursive: true});
  fs.writeFileSync(rootPath, `${JSON.stringify(sortedPackages, null, 0)}${EOL}`);
}

function buildPackageManifests(packageDirectPaths: string[]) {
  const packageManifests = new Map<string, Package>();
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
      } = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

      if (packageManifest.name === undefined)
        packageManifest.name = path.basename(path.dirname(packagePath)).replace(/\\/g, "/");
      if (packageManifest.author === undefined) packageManifest.author = "unknown";
      if (typeof packageManifest.author === "object") packageManifest.author = packageManifest.author.name;
      if (packageManifest.description === undefined)
        packageManifest.description = "This package has not provided a valid description.";

      if (packageManifest.version === undefined) packageManifest.version = "unknown";

      if (packageManifest.homepage === undefined && typeof packageManifest.repository === "string")
        packageManifest.homepage = packageManifest.repository;
      if (packageManifest.homepage === undefined && typeof packageManifest.repository === "object")
        packageManifest.homepage = packageManifest.repository.url;

      // cast to Package type
      packageManifests.set(packageManifest.name ?? "unkown", {
        name: packageManifest.name,
        author: packageManifest.author,
        description: packageManifest.description,
        homepage: packageManifest.homepage!,
        version: packageManifest.version,
        license: packageManifest.license ?? "unknown",
      } satisfies Package);
    }
  } catch (err) {
    console.error("Error reading package.json file:", err);
    exit(1);
  }
  return packageManifests;
}

function filterDependenciesManifestPathsWithDependenciesList(
  packageDirectPaths: string[],
  specifiedPackages: Set<string>,
) {
  console.info("Found ", packageDirectPaths.length, " manifest files in node_modules.");
  console.log("Filtering out packed node_modules...");

  packageDirectPaths = packageDirectPaths.filter((packagePath) => {
    // Filter 1: name filter
    const packageName = JSON.parse(fs.readFileSync(packagePath, "utf-8")).name;

    // Filter 2: path filter
    const pathParts = packagePath.match(/node_modules/g);
    if (pathParts === null || pathParts.length >= 2) return false;

    return specifiedPackages.has(packageName);
  });

  packageDirectPaths = packageDirectPaths.map((packagePath) => path.resolve(packagePath).replace(/\\/g, "/"));
  console.info("After filtering, found ", packageDirectPaths.length, " packages in node_modules.");
  return packageDirectPaths;
}

function extractDependenciesManifestPaths() {
  let pathToNodeModules = process.cwd();
  pathToNodeModules = path.resolve(pathToNodeModules, "node_modules");
  pathToNodeModules = pathToNodeModules.replace(/\\/g, "/");
  console.info("Identified path to node_modules:", pathToNodeModules);

  let packageRawPaths = globSync(pathToNodeModules, {ignore: "**/node_modules/**/node_modules/**"});
  let packageDirectPaths: string[] = []; // this will contain direct paths to the package.json files
  for (const path of packageRawPaths) packageDirectPaths.push(...globSync(`${path}/**/package.json`));
  return packageDirectPaths;
}

function extractDependenciesFromRootManifest() {
  console.info("Current directory:", process.cwd());

  let currentPackageManifestPath = process.cwd().concat("/package.json").replace(/\\/g, "/");
  console.log("Reading current package.json file from ", currentPackageManifestPath);
  const currentPackageManifest = JSON.parse(fs.readFileSync(currentPackageManifestPath, "utf-8"));

  const dependencies = Object.keys(currentPackageManifest.dependencies ?? {});
  const devDependencies = Object.keys(currentPackageManifest.devDependencies ?? {});
  const specifiedPackages = new Set([...dependencies, ...devDependencies]);
  console.info("Found ", specifiedPackages.size, " total packages in package.json.");
  console.info("Production packages: ", dependencies.length);
  console.info("Development packages: ", devDependencies.length);
  return specifiedPackages;
}

generateAcknowledgments();

