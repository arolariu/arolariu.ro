"use client";

import type {Invoice} from "@/types/invoices";
import {Button, Input, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useCallback, useState} from "react";
import {TbPrinter} from "react-icons/tb";

type Props = {
  invoice: Invoice;
};

/**
 * Renders the editable invoice header with inline name editing and print functionality.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Why Client Component?**
 * - Uses `useState` for controlled input of invoice name
 * - Requires `useCallback` for memoized event handlers
 * - Needs access to `window.print()` browser API
 *
 * **Editing Capabilities**:
 * - **Invoice Name**: Inline editable via styled `<Input>` component with transparent
 *   borders. Changes are managed locally; persistence requires explicit save action.
 * - **Print**: Triggers browser print dialog for the entire invoice page.
 *
 * **Layout**: Responsive flexbox layout that stacks vertically on mobile and
 * horizontally on desktop (`md:flex-row`). Invoice ID is displayed as muted
 * subtext below the editable name.
 *
 * **Animation**: Uses Framer Motion for entrance animation with vertical slide
 * and fade effect.
 *
 * **Accessibility**: Print button wrapped in `Tooltip` for additional context.
 *
 * @param props - Component properties containing the invoice to display/edit
 * @returns Client-rendered JSX element containing editable invoice header
 *
 * @example
 * ```tsx
 * <InvoiceHeader invoice={invoice} />
 * // Renders: [Editable Invoice Name Input] [Invoice ID] [Print Button]
 * ```
 *
 * @see {@link Invoice} - Invoice type definition
 */
export default function InvoiceHeader({invoice}: Readonly<Props>): React.JSX.Element {
  const [invoiceName, setInvoiceName] = useState<string>(invoice.name);

  const handleNameChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInvoiceName(event.target.value);
  }, []);

  const handleInvoicePrint = useCallback(() => {
    globalThis.window.print();
  }, []);

  return (
    <motion.div
      initial={{opacity: 0, y: -20}}
      animate={{opacity: 1, y: 0}}
      transition={{duration: 0.5}}
      className='mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center'>
      <div className='flex items-center gap-2'>
        <div>
          <Input
            type='text'
            value={invoiceName}
            onChange={handleNameChange}
            className='w-full border-0 text-3xl font-bold tracking-tight focus-visible:border-0 focus-visible:ring-0'
          />
          <p className='text-gray-300 dark:text-gray-800'>{invoice.id}</p>
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className='cursor-pointer'
                variant='outline'
                size='sm'
                onClick={handleInvoicePrint}>
                <TbPrinter className='mr-2 h-4 w-4' />
                Print
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Print this invoice with all details</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  );
}
