/** @format */

import {TIMESTAMP} from "@/lib/utils.generic";
import type {NodePackageInformation} from "@/types/common/types";
import type {Metadata} from "next";
import licenses from "../../../licenses.json";
import AcknowledgementsTable from "./island";

export const metadata: Metadata = {
  title: "Acknowledgements",
  description: "Acknowledgements page for the third-party packages used in this project.",
};

/**
 * Acknowledgements page for the third-party packages used in this project.
 */
export default function AcknowledgementsPage() {
  const packages: NodePackageInformation[] = licenses;

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
      </section>
      <AcknowledgementsTable packages={packages} />
    </main>
  );
}
