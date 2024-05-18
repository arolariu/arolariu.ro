/** @format */

import {DashboardIcon, HeartFilledIcon, MoonIcon, SunIcon, TextAlignJustifyIcon} from "@radix-ui/react-icons";

interface Props {
  filters: {isImportant: boolean; dayOnly: boolean; nightOnly: boolean};
  setDisplayStyle: (style: "grid" | "list") => void;
  setFilters: (filters: {isImportant: boolean; dayOnly: boolean; nightOnly: boolean}) => void;
}

export const InvoiceFilters = ({filters, setDisplayStyle, setFilters}: Readonly<Props>) => {
  return (
    <article className='flex flex-row items-stretch justify-between justify-items-stretch px-4 py-8'>
      <div>
        Filters:
        <div className='flex flex-row items-end justify-end justify-items-end gap-6 pt-2'>
          <SunIcon
            className={`${filters.dayOnly ? "text-yellow-500" : ""} 'tooltip cursor-pointer' tooltip-bottom h-5 w-5 `}
            data-tip='Day invoices'
            onClick={() => setFilters({...filters, dayOnly: !filters.dayOnly})}
          />
          <MoonIcon
            className={`${filters.nightOnly ? "text-blue-500" : ""} 'tooltip cursor-pointer' tooltip-bottom h-5 w-5 `}
            data-tip='Night invoices'
            onClick={() => setFilters({...filters, nightOnly: !filters.nightOnly})}
          />
          <HeartFilledIcon
            className={`${filters.isImportant ? "text-red-500" : ""} 'tooltip cursor-pointer' tooltip-bottom h-5 w-5 `}
            data-tip='Important invoices'
            onClick={() => setFilters({...filters, isImportant: !filters.isImportant})}
          />
        </div>
      </div>
      <div className='w-1/3'>
        <input
          className='w-full rounded border border-gray-200 p-2'
          placeholder='Search for a specific invoice...'
        />
      </div>
      <div>
        Display mode:
        <div className='flex flex-row items-end justify-end justify-items-end gap-6 pt-2'>
          <DashboardIcon
            className='tooltip tooltip-bottom h-5 w-5 cursor-pointer'
            data-tip='List display'
            onClick={() => setDisplayStyle("list")}
          />
          <TextAlignJustifyIcon
            className='tooltip tooltip-bottom h-5 w-5 cursor-pointer'
            data-tip='Grid display'
            onClick={() => setDisplayStyle("grid")}
          />
        </div>
      </div>
    </article>
  );
};
