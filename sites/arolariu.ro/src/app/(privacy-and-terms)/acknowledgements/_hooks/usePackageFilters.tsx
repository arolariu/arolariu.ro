import type {NodePackageInformation, NodePackagesJSON} from "@/types";
import {type Dispatch, type SetStateAction, useCallback, useMemo, useState} from "react";

type SortField = Readonly<"name" | "dependencies" | "type">;
type SortDirection = Readonly<"asc" | "desc">;
type PackageType = Readonly<"all" | "production" | "development">;

type HookInputType = Readonly<NodePackagesJSON>;
type HookReturnType = Readonly<{
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  sortField: SortField;
  setSortField: Dispatch<SetStateAction<SortField>>;
  sortDirection: SortDirection;
  setSortDirection: Dispatch<SetStateAction<SortDirection>>;
  packageType: PackageType;
  setPackageType: Dispatch<SetStateAction<PackageType>>;
  filteredAndSortedPackages: Array<NodePackageInformation>;
  extractPackageType: (pkg: {name: string}) => PackageType;
}>;

/**
 * Internal function for comparing package types.
 * @returns A negative number if `a` should be sorted before `b`, a positive number if `a` should be sorted after `b`, and 0 if they are equal.
 */
function __comparePackageTypes__(
  a: NodePackageInformation,
  b: NodePackageInformation,
  direction: SortDirection,
  extractPackageType: (pkg: {name: string}) => PackageType,
): number {
  const typeA = extractPackageType(a);
  const typeB = extractPackageType(b);
  if (typeA === typeB) {
    return 0;
  }

  if (direction === "asc") {
    return typeA === "production" ? -1 : 1;
  } else {
    return typeA === "development" ? -1 : 1;
  }
}

/**
 * Internal function for extracting the package type.
 * @returns The package type ("all" | "production" | "development") for the given package.
 */
function __extractPackageType__(pkg: {name: string}, packages: HookInputType): Readonly<PackageType> {
  const productionPackages = packages.production ?? [];
  const developmentPackages = packages.development ?? [];

  if (productionPackages.some((p) => p.name === pkg.name)) {
    return "production";
  }
  if (developmentPackages.some((p) => p.name === pkg.name)) {
    return "development";
  }

  return "all";
}

/**
 * Internal function for sorting packages based on the selected field and direction.
 * @returns A negative number if `a` should be sorted before `b`, a positive number if `a` should be sorted after `b`, and 0 if they are equal.
 */
function __sortPackages__(
  a: NodePackageInformation,
  b: NodePackageInformation,
  sortField: SortField,
  sortDirection: SortDirection,
  extractPackageType: (pkg: {name: string}) => PackageType,
): Readonly<number> {
  switch (sortField) {
    case "dependencies":
      return sortDirection === "asc"
        ? (a.dependents?.length ?? 0) - (b.dependents?.length ?? 0)
        : (b.dependents?.length ?? 0) - (a.dependents?.length ?? 0);
    case "name":
      return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    case "type":
      return __comparePackageTypes__(a, b, sortDirection, extractPackageType);
    default:
      return 0;
  }
}

/**
 * Custom React hook for filtering, sorting, and managing package data.
 *
 * This hook provides state management and utility functions for working with Node.js package
 * dependencies. It enables searching, sorting by different fields, and filtering packages by type.
 * @param packages The package data to filter and sort, containing production and development dependencies.
 * @returns An object containing:
 * - searchQuery: The current search query string
 * - setSearchQuery: Function to update the search query
 * - sortField: The current field used for sorting ("name" | "dependencies" | "type")
 * - setSortField: Function to change the sort field
 * - sortDirection: The current sort direction ("asc" | "desc")
 * - setSortDirection: Function to toggle sort direction
 * - packageType: The current package type filter ("all" | "production" | "development")
 * - setPackageType: Function to change the package type filter
 * - filteredAndSortedPackages: Array of packages after applying all filters and sorting
 * - extractPackageType: Function to determine the type of a given package
 * @example
 * const {
 *   searchQuery, setSearchQuery,
 *   filteredAndSortedPackages
 * } = usePackageFilters(nodePackages);
 */
export function usePackageFilters(packages: HookInputType): Readonly<HookReturnType> {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [packageType, setPackageType] = useState<PackageType>("all");
  const memoizedExtractPackageType = useCallback((pkg: {name: string}): PackageType => __extractPackageType__(pkg, packages), [packages]);

  // Wrapped in a Set and useMemo to avoid duplicates and unnecessary recalculations.
  const flatPackages = useMemo(
    () => new Set([packages.development || [], packages.production || [], packages.peer || []].flat()),
    [packages],
  );

  const filteredAndSortedPackages = useMemo(
    () =>
      Array.from(flatPackages)
        // Filter by search query
        .filter(
          (pkg) =>
            // Filter by package name
            pkg.name.toLowerCase().includes(searchQuery.toLowerCase())
            // Filter by any dependent package name
            || (pkg.dependents?.some((dep) => dep.name.toLowerCase().includes(searchQuery.toLowerCase())) ?? false),
        )
        // Then filter by package type
        .filter((pkg) => {
          if (packageType === "all") {
            return true;
          }
          return memoizedExtractPackageType(pkg) === packageType;
        })
        // Then sort by the selected field and direction
        .toSorted((a, b) => __sortPackages__(a, b, sortField, sortDirection, memoizedExtractPackageType)),
    [flatPackages, searchQuery, packageType, sortField, sortDirection, memoizedExtractPackageType],
  );

  return {
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    packageType,
    setPackageType,
    filteredAndSortedPackages,
    extractPackageType: memoizedExtractPackageType,
  } as const;
}
