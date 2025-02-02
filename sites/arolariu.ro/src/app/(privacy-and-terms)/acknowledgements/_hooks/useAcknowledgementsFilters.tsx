/** @format */

import type {NodePackageInformation, NodePackagesJSON} from "@/types";
import {useCallback, useMemo, useState} from "react";

type FilterType = "all" | "production" | "development";

type HookReturnType = {
  filteredPackages: NodePackageInformation[];
  handleShowProductionPackages: () => void;
  handleShowDevelopmentPackages: () => void;
  handleResetPackagesFilter: () => void;
};

/**
 * Hook that handles the filters for the acknowledgements page.
 */
export default function useAcknowledgementsFilters({packages}: Readonly<{packages: NodePackagesJSON}>): HookReturnType {
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
