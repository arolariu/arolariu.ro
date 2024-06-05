/** @format */

import {Button} from "@/components/ui/button";
import {DashboardIcon, HeartFilledIcon, MoonIcon, SunIcon, TextAlignJustifyIcon} from "@radix-ui/react-icons";

interface Props {
  filters: Readonly<{isImportant: boolean; dayOnly: boolean; nightOnly: boolean}>;
  displayStyle: "grid" | "list";
  setDisplayStyle: (style: "grid" | "list") => void;
  setFilters: (filters: Readonly<{isImportant: boolean; dayOnly: boolean; nightOnly: boolean}>) => void;
}

export const InvoiceFilters = ({filters, displayStyle, setDisplayStyle, setFilters}: Readonly<Props>) => {
  return (
    <article className='flex items-stretch justify-between justify-items-stretch gap-0 px-4 py-8 2xsm:flex-col 2xsm:gap-8 md:flex-row'>
      <div>
        Filters:
        <div className='flex flex-row gap-6 pt-2 2xsm:items-stretch 2xsm:justify-between 2xsm:justify-items-center md:items-end md:justify-end md:justify-items-end'>
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
      <div className='w-1/3 2xsm:hidden md:block'>
        <input
          className='w-full rounded border border-gray-200 p-2'
          placeholder='Search for a specific invoice...'
        />
      </div>
      <div>
        Display mode:
        <div className='flex-row items-end justify-end justify-items-end gap-6 pt-2 2xsm:hidden md:flex'>
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
        <div className='flex-row items-center justify-center justify-items-center gap-6 pt-2 2xsm:flex md:hidden'>
          <Button
            className='w-1/2'
            onClick={() => setDisplayStyle("list")}
            disabled={displayStyle === "list"}
            variant={displayStyle === "list" ? "outline" : "secondary"}>
            List
          </Button>
          <Button
            className='w-1/2'
            onClick={() => setDisplayStyle("grid")}
            disabled={displayStyle === "grid"}
            variant={displayStyle === "grid" ? "outline" : "secondary"}>
            Grid
          </Button>
        </div>
      </div>
      <div className='w-full 2xsm:block md:hidden'>
        <input
          className='w-full rounded border border-gray-200 p-2'
          placeholder='Search for a specific invoice...'
        />
      </div>
    </article>
  );
};
