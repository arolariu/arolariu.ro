/** @format */

"use client";

import {Button} from "@/components/ui/button";
import {ExternalLinkIcon} from "@radix-ui/react-icons";
import Link from "next/link";
import {useState} from "react";

type Package = {
  name: string;
  author: string;
  description: string;
  homepage?: string;
  version: string;
  license: string;
  dependecyType: string;
};

interface Props {
  packages: Readonly<Package[]>;
}

/**
 * Table of acknowledgements for the third-party packages used in this project.
 */
export default function AcknowledgementsTable({packages}: Readonly<Props>) {
  const [shownPackages, setShownPackages] = useState<Readonly<Package[]>>(packages);
  const productionPackages = packages.filter((pkg) => pkg.dependecyType === "production");
  const developmentPackages = packages.filter((pkg) => pkg.dependecyType === "development");
  const isShowingAllPackages = shownPackages.length === packages.length;

  return (
    <section>
      <div className='flex flex-row items-center justify-between justify-items-center gap-4'>
        <Button onClick={() => setShownPackages(productionPackages)}>Show Production Packages</Button>
        <Button onClick={() => setShownPackages(developmentPackages)}>Show Development Packages</Button>
        <Button
          variant='outline'
          onClick={() => setShownPackages(packages)}>
          Show all packages {!isShowingAllPackages && "(RESET)"}
        </Button>
      </div>
      <div className='mx-auto grid max-w-3xl grid-cols-12 gap-10 pt-4'>
        {shownPackages.map((license) => (
          <Link
            key={license.name}
            className='group col-span-full flex-col space-y-1 overflow-hidden rounded-lg border border-gray-200 p-4 shadow-md  transition-opacity duration-300 ease-in hover:shadow-lg'
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
                <ExternalLinkIcon className='inline' />
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
