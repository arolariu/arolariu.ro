/** @format */

"use client";

import type {NodePackageInformation, NodePackagesJSON} from "@/types/common/types";
import {useCallback, useMemo, useState} from "react";
import {Button} from "react-aria-components";
import PackageCard from "./_components/PackageCard";

type Props = {packages: NodePackagesJSON};
type FilterType = "all" | "production" | "development";

/**
 * The client-side rendered acknowledgements page.
 * @returns The acknowledgements page, CSR'ed.
 */
export default function RenderAcknowledgementsPage({packages}: Readonly<Props>) {
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

  return (
    <section>
      <div className='flex items-center justify-between justify-items-center gap-4 2xsm:flex-col md:flex-row'>
        <Button
          className='rounded-xl border bg-gray-200 p-2 dark:bg-gray-800'
          onPress={handleShowProductionPackages}>
          Show Production Packages
        </Button>
        <Button
          className='rounded-xl border bg-gray-200 p-2 dark:bg-gray-800'
          onPress={handleShowDevelopmentPackages}>
          Show Development Packages
        </Button>
        <Button onPress={handleResetPackagesFilter}>Show all packages {filter !== "all" && "(RESET)"}</Button>
      </div>
      <div className='flex flex-col flex-nowrap gap-10 pt-4'>
        {filteredPackages.map((pkg) => (
          <PackageCard
            key={pkg.name + pkg.version}
            pkg={pkg}
          />
        ))}
      </div>
    </section>
  );
}
