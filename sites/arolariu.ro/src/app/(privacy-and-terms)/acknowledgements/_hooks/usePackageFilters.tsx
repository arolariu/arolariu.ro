/** @format */

import type {NodePackageInformation, NodePackagesJSON} from "@/types";
import {type Dispatch, type SetStateAction, useCallback, useMemo, useState} from "react";

type SortField = "name" | "dependencies" | "type";
type SortDirection = "asc" | "desc";
type PackageType = "all" | "production" | "development";

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
 */
function __comparePackageTypes__(
  a: NodePackageInformation,
  b: NodePackageInformation,
  direction: SortDirection,
  extractPackageType: (pkg: {name: string}) => PackageType,
): number {
  const typeA = extractPackageType(a);
  const typeB = extractPackageType(b);
  if (typeA === typeB) return 0;
  if (direction === "asc") {
    return typeA === "production" ? -1 : 1;
  } else {
    return typeA === "development" ? -1 : 1;
  }
}

/**
 * Internal function for extracting the package type.
 */
function __extractPackageType__(pkg: {name: string}, packages: HookInputType): PackageType {
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
 */
function __sortPackages__(
  a: NodePackageInformation,
  b: NodePackageInformation,
  sortField: SortField,
  sortDirection: SortDirection,
  extractPackageType: (pkg: {name: string}) => PackageType,
): number {
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
export function usePackageFilters(packages: HookInputType): HookReturnType {
  const memoizedExtractPackageType = useCallback((pkg: {name: string}): PackageType => __extractPackageType__(pkg, packages), [packages]);

  const flatPackages = useMemo(() => Object.values(packages).flat(), [packages]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [packageType, setPackageType] = useState<PackageType>("all");

  const filteredAndSortedPackages = flatPackages
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
      if (packageType === "all") return true;
      return memoizedExtractPackageType(pkg) === packageType;
    })
    // Then sort by the selected field and direction
    .sort((a, b) => __sortPackages__(a, b, sortField, sortDirection, memoizedExtractPackageType));

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
