"use client";

import {useInvoicesStore} from "@/stores";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
} from "@arolariu/components";
import React, {useCallback, useState} from "react";
import {TbDownload, TbFileSpreadsheet, TbFileText, TbJson} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import type {InvoiceExportRequest} from "../../_types/InvoiceExport";
import {exportInvoices} from "../../_utils/export";

/**
 * The ExportDialog component allows users to export selected invoices in various formats.
 * It includes options to include metadata and line items in the export.
 * @returns The ExportDialog component, CSR'ed.
 */
export default function ExportDialog(): React.JSX.Element {
  const [exportOptions, setExportOptions] = useState<InvoiceExportRequest>({
    format: "csv",
    includeMetadata: false,
    includeMerchant: false,
    includeProducts: false,
  });

  const {isOpen, open, close} = useDialog("VIEW_INVOICES__EXPORT");
  const selectedInvoices = useInvoicesStore((state) => state.selectedInvoices);
  const allInvoices = useInvoicesStore((state) => state.invoices);
  const invoicesToExport = selectedInvoices.length > 0 ? selectedInvoices : allInvoices;

  const handleExport = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      exportInvoices(invoicesToExport, exportOptions);
    },
    [invoicesToExport, exportOptions],
  );

  const handleOptionsChange = useCallback((key: keyof InvoiceExportRequest, value: any) => {
    setExportOptions((prev) => ({...prev, [key]: value}));
  }, []);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Export Invoices</DialogTitle>
          <DialogDescription>Export {invoicesToExport.length} invoices in your preferred format.</DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-4'>
          <div className='space-y-2'>
            <h3 className='text-sm font-medium'>Export Format</h3>
            <RadioGroup
              defaultValue={exportOptions.format}
              // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
              onValueChange={(format) => handleOptionsChange("format", format)}>
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
                checked={exportOptions.includeMetadata}
                // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                onCheckedChange={(checked) => handleOptionsChange("includeMetadata", checked === true)}
              />
              <Label htmlFor='include-metadata'>Include metadata</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='include-items'
                checked={exportOptions.includeProducts}
                // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                onCheckedChange={(checked) => handleOptionsChange("includeProducts", checked === true)}
              />
              <Label htmlFor='include-items'>Include products</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <Checkbox
                id='include-merchant'
                checked={exportOptions.includeMerchant}
                // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                onCheckedChange={(checked) => handleOptionsChange("includeMerchant", checked === true)}
              />
              <Label htmlFor='include-merchant'>Include merchant</Label>
            </div>
            {exportOptions.format === "csv" && (
              <>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='csv-include-headers'
                    checked={exportOptions.csvOptions?.includeHeaders}
                    // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                    onCheckedChange={(checked) => handleOptionsChange("csvOptions", {...exportOptions.csvOptions, includeHeaders: checked})}
                  />
                  <Label htmlFor='csv-include-headers'>Include CSV Headers</Label>
                </div>
                <Label htmlFor='csv-delimiter'>CSV Delimiter Override (optional):</Label>
                <Input
                  className='w-1/2'
                  id='csv-delimiter'
                  placeholder=','
                  value={exportOptions.csvOptions?.delimiter}
                  // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                  onChange={(e) => handleOptionsChange("csvOptions", {...exportOptions.csvOptions, delimiter: e.target.value})}
                />
              </>
            )}
            {exportOptions.format === "json" && (
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='json-pretty-print'
                  checked={exportOptions.jsonOptions?.prettyPrint}
                  // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                  onCheckedChange={(checked) => handleOptionsChange("jsonOptions", {...exportOptions.jsonOptions, prettyPrint: checked})}
                />
                <Label htmlFor='json-pretty-print'>Pretty Print (2 spaces)</Label>
              </div>
            )}
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
