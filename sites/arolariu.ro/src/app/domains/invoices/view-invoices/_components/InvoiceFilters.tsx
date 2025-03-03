/** @format */

"use client";

import {Button} from "@arolariu/components/button";
import {GoColumns, GoHeart, GoMoon, GoServer, GoSun} from "react-icons/go";

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
          <GoSun
            className={`${filters.dayOnly ? "text-yellow-500" : ""} 'tooltip cursor-pointer' tooltip-bottom h-5 w-5`}
            data-tip='Day invoices'
            onClick={() => setFilters({...filters, dayOnly: !filters.dayOnly})}
          />
          <GoMoon
            className={`${filters.nightOnly ? "text-blue-500" : ""} 'tooltip cursor-pointer' tooltip-bottom h-5 w-5`}
            data-tip='Night invoices'
            onClick={() => setFilters({...filters, nightOnly: !filters.nightOnly})}
          />
          <GoHeart
            className={`${filters.isImportant ? "text-red-500" : ""} 'tooltip cursor-pointer' tooltip-bottom h-5 w-5`}
            data-tip='Important invoices'
            onClick={() => setFilters({...filters, isImportant: !filters.isImportant})}
          />
        </div>
      </div>
      <div>
        Display mode:
        <div className='flex-row items-end justify-end justify-items-end gap-6 pt-2 2xsm:hidden md:flex'>
          <GoColumns
            className='tooltip tooltip-bottom h-5 w-5 cursor-pointer'
            data-tip='List display'
            onClick={() => setDisplayStyle("list")}
          />
          <GoServer
            className='tooltip tooltip-bottom h-5 w-5 cursor-pointer'
            data-tip='Grid display'
            onClick={() => setDisplayStyle("grid")}
          />
        </div>
        <div className='flex-row items-center justify-center justify-items-center gap-6 pt-2 2xsm:flex md:hidden'>
          <Button
            className={`${displayStyle === "list" ? "" : "bg-blue"} w-1/2`}
            onClick={() => setDisplayStyle("list")}
            disabled={displayStyle === "list"}>
            List
          </Button>
          <Button
            className={`${displayStyle === "grid" ? "" : "bg-blue"} w-1/2`}
            onClick={() => setDisplayStyle("grid")}
            disabled={displayStyle === "grid"}>
            Grid
          </Button>
        </div>
      </div>
    </article>
  );
};
