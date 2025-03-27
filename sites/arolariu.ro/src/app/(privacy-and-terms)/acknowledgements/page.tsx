/** @format */

import licenses from "@/../licenses.json";
import {TIMESTAMP} from "@/lib/utils.generic";
import type {NodePackagesJSON} from "@/types";
import type {Metadata} from "next";
import RenderAcknowledgementsScreen from "./island";

export const metadata: Metadata = {
  title: "Acknowledgements",
  description: "Acknowledgements page for the third-party packages used in this project and collaborators.",
};

/**
 * Acknowledgements page for the third-party packages used in this project.
 * @returns The acknowledgements page, SSR'ed.
 */
export default async function AcknowledgementsPage() {
  const lastUpdatedDate = new Date(TIMESTAMP).toUTCString();

  return (
    <RenderAcknowledgementsScreen
      packages={licenses as NodePackagesJSON}
      lastUpdatedDate={lastUpdatedDate}
    />
  );
}
