/** @format */

"use client";

import {useZustandStore} from "@/hooks/stateStore";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  RadioGroup,
  RadioGroupItem,
} from "@arolariu/components";
import React, {useCallback, useState} from "react";
import {TbDownload, TbFileSpreadsheet, TbFileText, TbJson} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";

/**
 * The ExportDialog component allows users to export selected invoices in various formats.
 * It includes options to include metadata and line items in the export.
 * @returns The ExportDialog component, CSR'ed.
 */
export default function ExportDialog(): React.JSX.Element {
  const [format, setFormat] = useState<"csv" | "json" | "pdf">("csv");
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(false);
  const [includeItems, setIncludeItems] = useState<boolean>(false);
  const {isOpen, open, close} = useDialog("INVOICES_EXPORT");
  const selectedInvoices = useZustandStore((state) => state.selectedInvoices);

  const handleExport = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // Simulate export logic
      console.log("Exporting invoices:", selectedInvoices, {
        format,
        includeMetadata,
        includeItems,
      });

      // Close the dialog after export
      close();
    },
    // TODO: maybe leave as simple handler? or pass params?
    [format, includeMetadata, includeItems, selectedInvoices, close],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Export Invoices</DialogTitle>
          <DialogDescription>Export {selectedInvoices.length} invoices in your preferred format.</DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <h3 className='text-sm font-medium'>Export Format</h3>
            <RadioGroup
              defaultValue={format}
              onValueChange={(value) => setFormat(value as any)}>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem
                  value='csv'
                  id='csv'
                />
                <Label
                  htmlFor='csv'
                  className='flex items-center gap-2'>
                  <TbFileSpreadsheet className='h-4 w-4' />
                  CSV
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem
                  value='json'
                  id='json'
                />
                <Label
                  htmlFor='json'
                  className='flex items-center gap-2'>
                  <TbJson className='h-4 w-4' />
                  JSON
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem
                  value='pdf'
                  id='pdf'
                />
                <Label
                  htmlFor='pdf'
                  className='flex items-center gap-2'>
                  <TbFileText className='h-4 w-4' />
                  PDF
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className='space-y-2'>
            <h3 className='text-sm font-medium'>Options</h3>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='include-metadata'
                checked={includeMetadata}
                onCheckedChange={(checked) => setIncludeMetadata(checked === true)}
              />
              <Label htmlFor='include-metadata'>Include metadata</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='include-items'
                checked={includeItems}
                onCheckedChange={(checked) => setIncludeItems(checked === true)}
              />
              <Label htmlFor='include-items'>Include line items</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={close}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            className='gap-2'>
            <TbDownload className='h-4 w-4' />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
