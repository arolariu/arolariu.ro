/** @format */

"use client";

import type {NodePackagesJSON} from "@/types";
import {Button} from "react-aria-components";
import PackageCard from "./_components/PackageCard";
import useAcknowledgementsFilters from "./_hooks/useAcknowledgementsFilters";

type Props = {packages: NodePackagesJSON};

/**
 * The client-side rendered acknowledgements page.
 * @returns The acknowledgements page, CSR'ed.
 */
export default function RenderAcknowledgementsPage({packages}: Readonly<Props>) {
  const {filteredPackages, handleShowProductionPackages, handleShowDevelopmentPackages, handleResetPackagesFilter} =
    useAcknowledgementsFilters({packages});

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
        <Button onPress={handleResetPackagesFilter}>Show all packages </Button>
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
