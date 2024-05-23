/** @format */

import {TIMESTAMP} from "@/lib/utils.generic";
import {ExternalLinkIcon} from "@radix-ui/react-icons";
import Link from "next/link";
import licenses from "../../../licenses.json";

type Package = {
  name: string;
  author: string;
  description: string;
  homepage?: string;
  version: string;
  license: string;
  dependecyType: string | "production" | "development";
};

export default async function AcknowledgementsPage() {
  const packages: Package[] = licenses;

  return (
    <main className='flex flex-col flex-nowrap items-center justify-center justify-items-center gap-8 px-12 py-24'>
      <section>
        <h1 className='bg-gradient-to-r from-cyan-500 to-purple-500 bg-clip-text text-3xl font-black text-transparent'>
          Acknowledgements (3rd party packages)
        </h1>
        <p className='text-center'>
          Last updated: <small>{new Date(TIMESTAMP).toUTCString()}</small>
        </p>
      </section>
      <section>
        <article className='pb-4 text-center text-xl'>
          This website could not have been possible without the following third-party packages. <br /> I would like to
          thank the authors of these packages for their hard work and dedication to the open-source community.
        </article>
        <div className='pb-8'>
          <h2 className='inline text-2xl font-black underline'>Total Packages: {packages.length}</h2>
          <span className='inline no-underline'>
            {" "}
            (of which, around{" "}
            <code className='tracking-widest'>
              {(
                (packages.filter((pkg) => pkg.dependecyType === "production").length / packages.length) *
                100
              ).toPrecision(4)}
            </code>
            % are production packages, and{" "}
            <code className='tracking-widest'>
              {((packages.filter((pkg) => pkg.name.startsWith("@types")).length / packages.length) * 100).toPrecision(
                2,
              )}
            </code>
            % are typedef packages)
          </span>
        </div>
        <div className='mx-auto grid max-w-3xl grid-cols-12 gap-10'>
          {packages.map((license) => (
            <Link
              key={license.name}
              className='group col-span-full flex-col space-y-1 overflow-hidden'
              href={
                license.homepage?.startsWith("https")
                  ? license.homepage
                  : `https://www.npmjs.com/package/${license.name}`.replace(/\/\//g, "/")
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
                {[license.license, license.author].filter(Boolean).join(" license, by ")}
              </article>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
