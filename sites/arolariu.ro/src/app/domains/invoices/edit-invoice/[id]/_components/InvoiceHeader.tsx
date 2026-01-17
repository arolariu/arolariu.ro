"use client";

import {Button, Input, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {motion} from "motion/react";
import {useCallback} from "react";
import {TbDeviceFloppy, TbPrinter, TbScanEye, TbTrash, TbX} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {useEditInvoiceContext} from "../_context/EditInvoiceContext";

/**
 * Renders the editable invoice header with inline name editing, save, and print functionality.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Why Client Component?**
 * - Uses `useState` for controlled input of invoice name
 * - Requires `useCallback` for memoized event handlers
 * - Needs access to `window.print()` browser API
 * - Consumes EditInvoiceContext for centralized state management
 *
 * **Editing Capabilities**:
 * - **Invoice Name**: Inline editable via styled `<Input>` component with transparent
 *   borders. Changes are tracked in EditInvoiceContext.
 * - **Save**: Centralized save button that persists all pending changes via patchInvoice.
 * - **Discard**: Reverts all pending changes without saving.
 * - **Print**: Triggers browser print dialog for the entire invoice page.
 *
 * **Layout**: Responsive flexbox layout that stacks vertically on mobile and
 * horizontally on desktop (`md:flex-row`). Invoice ID is displayed as muted
 * subtext below the editable name.
 *
 * **Animation**: Uses Framer Motion for entrance animation with vertical slide
 * and fade effect.
 *
 * @returns Client-rendered JSX element containing editable invoice header
 *
 * @example
 * ```tsx
 * <InvoiceHeader />
 * // Renders: [Editable Invoice Name Input] [Invoice ID] [Save] [Print] [Delete]
 * ```
 *
 * @see {@link useEditInvoiceContext} - Context for tracking pending changes
 */
export default function InvoiceHeader(): React.JSX.Element {
  const {invoice, pendingChanges, hasChanges, isSaving, setName, saveChanges, discardChanges} = useEditInvoiceContext();
  const {open: openDeleteDialog} = useDialog("SHARED__INVOICE_DELETE", "delete", {invoice});
  const {open: openAnalysisDialog} = useDialog("EDIT_INVOICE__ANALYSIS", "view", {invoice});
  const canAnalyze = invoice.items.length <= 0;

  // Derive the displayed name from pending changes or the original invoice name
  const invoiceName = pendingChanges.name ?? invoice.name;

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newName = event.target.value;
      setName(newName);
    },
    [setName],
  );

  const handleInvoicePrint = useCallback(() => {
    globalThis.window.print();
  }, []);

  const handleSave = useCallback(async () => {
    await saveChanges();
  }, [saveChanges]);

  const handleDiscard = useCallback(() => {
    discardChanges();
  }, [discardChanges]);

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
        </div>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <TooltipProvider>
          {/* Save & Discard buttons - only show when there are changes */}
          {hasChanges ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='default'
                    size='sm'
                    onClick={handleSave}
                    disabled={isSaving}>
                    <TbDeviceFloppy className='mr-2 h-4 w-4' />
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save all pending changes</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleDiscard}
                    disabled={isSaving}>
                    <TbX className='mr-2 h-4 w-4' />
                    Discard
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Discard all pending changes</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
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
          {Boolean(canAnalyze) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openAnalysisDialog}
                  variant='outline'
                  size='sm'>
                  <TbScanEye className='mr-2 h-4 w-4' />
                  Analyze with AI
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Analyze spending patterns for this invoice</p>
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={openDeleteDialog}
                variant='destructive'
                size='sm'>
                <TbTrash className='mr-2 h-4 w-4' />
                Delete
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete this invoice permanently</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </motion.div>
  );
}
