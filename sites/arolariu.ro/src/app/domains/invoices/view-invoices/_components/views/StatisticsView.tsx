/** @format */

import type {Invoice} from "@/types/invoices";

type Props = {
  invoices: Invoice[];
};

/**
 * This function renders the statistics view for the invoices.
 * It provides an overview of the invoice management system and allows users to track their spending habits.
 * @param invoices The list of invoices to display.
 * @returns This function renders the statistics view for the invoices.
 */
export default function RenderStatisticsView({invoices}: Readonly<Props>): React.JSX.Element {
  // todo: complete this.
  console.log(invoices);

  return (
    <div className='space-y-4'>
      <div className='flex flex-col justify-between gap-4 sm:flex-row'>
        <div className='relative flex-1'>
          <h1 className='text-3xl font-bold tracking-tight'>Invoice Management</h1>
          <p className='text-muted-foreground mt-1'>Manage your receipts and track your spending habits</p>
        </div>
      </div>
    </div>
  );
}
