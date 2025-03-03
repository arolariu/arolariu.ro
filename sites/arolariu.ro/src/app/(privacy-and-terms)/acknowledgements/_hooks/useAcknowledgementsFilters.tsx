/** @format */

import type {NodePackageInformation, NodePackagesJSON} from "@/types";
import {useCallback, useMemo, useState} from "react";

type FilterType = "all" | "production" | "development";

type HookInputType = Readonly<NodePackagesJSON>;
type HookReturnType = Readonly<{
  filteredPackages: NodePackageInformation[];
  handleShowProductionPackages: () => void;
  handleShowDevelopmentPackages: () => void;
  handleResetPackagesFilter: () => void;
}>;

/**
 * Custom hook to manage filtering of acknowledgement packages based on their type.
 *
 * @param packages - An object containing arrays of packages categorized by type (production, development, peer).
 *
 * @returns An object containing:
 * - `filteredPackages`: Array of packages filtered according to the current filter state.
 * - `handleShowProductionPackages`: Function to set the filter to show only production packages.
 * - `handleShowDevelopmentPackages`: Function to set the filter to show only development packages.
 * - `handleResetPackagesFilter`: Function to reset the filter and show all packages.
 */
export default function useAcknowledgementsFilters(packages: HookInputType): HookReturnType {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredPackages: NodePackageInformation[] = useMemo(() => {
    if (filter === "all") {
      return [...(packages.production ?? []), ...(packages.development ?? []), ...(packages.peer ?? [])];
    } else if (filter === "production") {
      return packages.production ?? [];
    } else {
      return packages.development ?? [];
    }
  }, [filter, packages]);

  const handleShowProductionPackages = useCallback(() => setFilter("production"), []);
  const handleShowDevelopmentPackages = useCallback(() => setFilter("development"), []);
  const handleResetPackagesFilter = useCallback(() => setFilter("all"), []);

  return {
    filteredPackages,
    handleShowProductionPackages,
    handleShowDevelopmentPackages,
    handleResetPackagesFilter,
  } as const;
}

