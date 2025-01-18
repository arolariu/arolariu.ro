/** @format */

import type {NodePackagesJSON} from "@/types/common/types";

type Props = {packages: NodePackagesJSON};

/**
 * This function builds a table that displays the number of production, development, peer, and type definition packages.
 * @param packages The packages to display.
 * @returns The table that displays the number of production, development, peer, and type definition packages.
 */
export default function PackagesTable({packages}: Readonly<Props>) {
  const totalPackages = Object.values(packages).flat().length;

  const productionPackages = packages.production?.length ?? 0;
  const developmentPackages = packages.development?.length ?? 0;
  const peerPackages = packages.peer?.length ?? 0;
  const productionPackagesPercentage = Math.round((productionPackages / totalPackages) * 100).toPrecision(2);
  const developmentPackagesPercentage = Math.round((developmentPackages / totalPackages) * 100).toPrecision(2);
  const peerPackagesPercentage = Math.round((peerPackages / totalPackages) * 100).toPrecision(2);

  const typeDefPackages = packages.development?.filter((pkg) => pkg.name.includes("types/")) ?? [];

  return (
    <table className='w-full table-auto'>
      <thead>
        <tr>
          <th>Production</th>
          <th>Development</th>
          <th>Peer</th>
          <th>Type Definition</th>
        </tr>
      </thead>
      <tbody className='text-center'>
        <tr>
          <td>
            {productionPackages} ({productionPackagesPercentage}%)
          </td>
          <td>
            {developmentPackages} ({developmentPackagesPercentage}%)
          </td>
          <td>
            {peerPackages} ({peerPackagesPercentage}%)
          </td>
          <td>{typeDefPackages.length}</td>
        </tr>
      </tbody>
    </table>
  );
}
