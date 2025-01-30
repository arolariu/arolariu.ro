/** @format */

import type {NodePackageInformation} from "@/types";
import Link from "next/link";
import {FaExternalLinkAlt} from "react-icons/fa";

/**
 * Function that generates a package card.
 * @returns A package card component.
 */
export default function PackageCard({pkg}: Readonly<{pkg: NodePackageInformation}>) {
  return (
    <Link
      key={pkg.name}
      className='group flex flex-col space-y-1 overflow-hidden rounded-lg border border-gray-200 p-4 shadow-md transition-opacity duration-300 ease-in hover:shadow-lg'
      href={
        pkg.homepage?.startsWith("https")
          ? pkg.homepage
          : `https://www.npmjs.com/package/${pkg.name}`.replaceAll("//", "/")
      }
      target='_blank'
      rel='noopener noreferrer'
      aria-label={`Open repository for ${pkg.name}`}>
      <div className='inline-flex items-end'>
        <div className='space-x-2 duration-300 ease-in group-hover:translate-x-6 group-hover:opacity-0'>
          <span className='text-2xl'>{pkg.name}</span>
          <span className='opacity-50'>{pkg.version}</span>
        </div>

        <div className='absolute mb-1 -translate-x-4 text-blue-600 opacity-0 duration-300 ease-in group-hover:translate-x-0 group-hover:opacity-100'>
          <FaExternalLinkAlt className='inline' />
          <span className='text-sm'> {pkg.homepage} </span>
        </div>
      </div>

      <article className='text-gray-400'>{pkg.description}</article>
      <article className='text-end text-gray-400'>
        {[pkg.license, pkg.author].filter(Boolean).join(" license, by ")} <br />
      </article>
    </Link>
  );
}
