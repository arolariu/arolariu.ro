/** @format */

"use client";

import Link from "next/link";
import {useState} from "react";
import {Button} from "react-aria-components";
import {FaExternalLinkAlt} from "react-icons/fa";

type Package = {
  name: string;
  author: string;
  description: string;
  homepage?: string;
  version: string;
  license: string;
  dependecyType: string;
};

type Props = {packages: readonly Package[]};

/**
 * Table of acknowledgements for the third-party packages used in this project.
 */
export default function AcknowledgementsTable({packages}: Readonly<Props>) {
  const [shownPackages, setShownPackages] = useState<readonly Package[]>(packages);
  const productionPackages = packages.filter((pkg) => pkg.dependecyType === "production");
  const developmentPackages = packages.filter((pkg) => pkg.dependecyType === "development");
  const isShowingAllPackages = shownPackages.length === packages.length;

  return (
    <section>
      <div className='flex items-center justify-between justify-items-center gap-4 2xsm:flex-col md:flex-row'>
        <Button
          className='rounded-xl border bg-gray-200 p-2 dark:bg-gray-800'
          onPress={() => setShownPackages(productionPackages)}>
          Show Production Packages
        </Button>
        <Button
          className='rounded-xl border bg-gray-200 p-2 dark:bg-gray-800'
          onPress={() => setShownPackages(developmentPackages)}>
          Show Development Packages
        </Button>
        <Button onPress={() => setShownPackages(packages)}>
          Show all packages {!isShowingAllPackages && "(RESET)"}
        </Button>
      </div>
      <div className='flex flex-col flex-nowrap gap-10 pt-4'>
        {shownPackages.map((license) => (
          <Link
            key={license.name}
            className='group flex flex-col space-y-1 overflow-hidden rounded-lg border border-gray-200 p-4 shadow-md transition-opacity duration-300 ease-in hover:shadow-lg'
            href={
              license.homepage?.startsWith("https")
                ? license.homepage
                : `https://www.npmjs.com/package/${license.name}`.replaceAll("//", "/")
            }
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`Open repository for ${license.name}`}>
            <div className='inline-flex items-end'>
              <div className='space-x-2 duration-300 ease-in group-hover:translate-x-6 group-hover:opacity-0'>
                <span className='text-2xl'>{license.name}</span>
                <span className='opacity-50'>{license.version}</span>
              </div>

              <div className='absolute mb-1 -translate-x-4 text-blue-600 opacity-0 duration-300 ease-in group-hover:translate-x-0 group-hover:opacity-100'>
                <FaExternalLinkAlt className='inline' />
                <span className='text-sm'> {license.homepage} </span>
              </div>
            </div>

            <article className='text-gray-400'>{license.description}</article>
            <article className='text-end text-gray-400'>
              {[license.license, license.author].filter(Boolean).join(" license, by ")} <br />
              <span className={`badge ${license.dependecyType === "production" ? "badge-primary" : "badge-secondary"}`}>
                USED AS A {license.dependecyType.toUpperCase()} PACKAGE
              </span>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
