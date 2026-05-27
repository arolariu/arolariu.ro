"use client";

import {useInvoicesStore} from "@/stores";
import {
  Button,
  Card,
  CardContent,
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
  toast,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import React, {useCallback, useMemo, useState} from "react";
import {TbCheck, TbCopy, TbDownload, TbFileSpreadsheet, TbFileText, TbJson} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import type {InvoiceExportFormat, InvoiceExportRequest} from "../../_types/InvoiceExport";
import {exportInvoices} from "../../_utils/export";
import styles from "./ExportDialog.module.scss";

/**
 * The ExportDialog component allows users to export selected invoices in various formats.
 * It includes options to include metadata and line items in the export.
 * Enhanced with custom filename, copy to clipboard for JSON, and file size estimate.
 * @returns The ExportDialog component, CSR'ed.
 */
export default function ExportDialog(): React.JSX.Element {
  const t = useTranslations();
  const [exportOptions, setExportOptions] = useState<InvoiceExportRequest>({
    format: "csv",
    includeMetadata: false,
    includeMerchant: false,
    includeProducts: false,
    csvOptions: {
      delimiter: ",",
      includeHeaders: true,
    },
    jsonOptions: {
      prettyPrint: false,
    },
  });

  // Generate default filename with current date
  const defaultFilename = `invoices-export-${new Date().toISOString().split("T")[0]}`;
  const [filename, setFilename] = useState<string>(defaultFilename);
  const [copied, setCopied] = useState<boolean>(false);

  const {isOpen, close} = useDialog("VIEW_INVOICES__EXPORT");
  const selectedInvoices = useInvoicesStore((state) => state.selectedEntities);
  const allInvoices = useInvoicesStore((state) => state.entities);
  const invoicesToExport = selectedInvoices.length > 0 ? selectedInvoices : allInvoices;

  /**
   * Estimate file size based on invoice count and options.
   */
  const estimatedSizeKB = useMemo(() => {
    const baseSize = invoicesToExport.length * 0.5; // 0.5 KB per invoice
    let multiplier = 1;

    if (exportOptions.includeMetadata) multiplier += 0.2;
    if (exportOptions.includeMerchant) multiplier += 0.3;
    if (exportOptions.includeProducts) multiplier += 1.5; // Products add significant size

    if (exportOptions.format === "json" && exportOptions.jsonOptions?.prettyPrint) {
      multiplier += 0.4; // Pretty print adds whitespace
    }

    return Math.round(baseSize * multiplier);
  }, [invoicesToExport.length, exportOptions]);

  const handleExport = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      exportInvoices(invoicesToExport, exportOptions, filename);
    },
    [invoicesToExport, exportOptions, filename],
  );

  /**
   * Copy JSON to clipboard (for JSON format only).
   */
  const handleCopyToClipboard = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        // Generate JSON string
        const jsonData = JSON.stringify(
          invoicesToExport.map((invoice) => ({
            id: invoice.id,
            merchantReference: exportOptions.includeMerchant ? invoice.merchantReference : undefined,
            paymentInformation: invoice.paymentInformation,
            createdAt: invoice.createdAt,
            additionalMetadata: exportOptions.includeMetadata ? invoice.additionalMetadata : undefined,
            items: exportOptions.includeProducts ? invoice.items : undefined,
          })),
          null,
          exportOptions.jsonOptions?.prettyPrint ? 2 : 0,
        );

        await navigator.clipboard.writeText(jsonData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error("Failed to copy to clipboard");
        console.error("Clipboard error:", error);
      }
    },
    [invoicesToExport, exportOptions],
  );

  const handleOptionsChange = useCallback(<K extends keyof InvoiceExportRequest>(key: K, value: InvoiceExportRequest[K]) => {
    setExportOptions((prev) => ({...prev, [key]: value}));
  }, []);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- inline event handler
      onOpenChange={(shouldOpen) => {
        if (!shouldOpen) close();
      }}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.exportDialog.title)}</DialogTitle>
          <DialogDescription>{t((m) => m.dialogs.invoices.exportDialog.description, {count: String(invoicesToExport.length)})}</DialogDescription>
        </DialogHeader>

        <div className={styles["body"]}>
          {/* Custom Filename Input */}
          <div className={styles["section"]}>
            <Label htmlFor='filename'>{t((m) => m.dialogs.invoices.exportDialog.filename.label)}</Label>
            <Input
              id='filename'
              placeholder={defaultFilename}
              value={filename}
              // eslint-disable-next-line react/jsx-no-bind -- inline event handler
              onChange={(e) => setFilename(e.target.value)}
              className={styles["filenameInput"]}
            />
            <p className={styles["hint"]}>{t((m) => m.dialogs.invoices.exportDialog.filename.hint)}</p>
          </div>

          {/* Format Selection Card */}
          <Card className={styles["formatCard"]}>
            <CardContent className={styles["cardContent"]}>
              <h3 className={styles["sectionTitle"]}>{t((m) => m.dialogs.invoices.exportDialog.format.title)}</h3>
              <RadioGroup
                value={exportOptions.format}
                // eslint-disable-next-line react/jsx-no-bind -- inline event handler
                onValueChange={(format) => handleOptionsChange("format", format as InvoiceExportFormat)}>
                <div className={styles["radioRow"]}>
                  <RadioGroupItem
                    nativeButton
                    value='csv'
                    id='csv'
                  />
                  <Label
                    htmlFor='csv'
                    className={styles["formatLabel"]}>
                    <TbFileSpreadsheet className={styles["formatIcon"]} />
                    <div>
                      <p className={styles["formatName"]}>{t((m) => m.dialogs.invoices.exportDialog.format.labels.csv)}</p>
                      <p className={styles["formatDesc"]}>{t((m) => m.dialogs.invoices.exportDialog.format.descriptions.csv)}</p>
                    </div>
                  </Label>
                </div>
                <div className={styles["radioRow"]}>
                  <RadioGroupItem
                    nativeButton
                    value='json'
                    id='json'
                  />
                  <Label
                    htmlFor='json'
                    className={styles["formatLabel"]}>
                    <TbJson className={styles["formatIcon"]} />
                    <div>
                      <p className={styles["formatName"]}>{t((m) => m.dialogs.invoices.exportDialog.format.labels.json)}</p>
                      <p className={styles["formatDesc"]}>{t((m) => m.dialogs.invoices.exportDialog.format.descriptions.json)}</p>
                    </div>
                  </Label>
                </div>
                <div className={styles["radioRow"]}>
                  <RadioGroupItem
                    nativeButton
                    value='pdf'
                    id='pdf'
                  />
                  <Label
                    htmlFor='pdf'
                    className={styles["formatLabel"]}>
                    <TbFileText className={styles["formatIcon"]} />
                    <div>
                      <p className={styles["formatName"]}>{t((m) => m.dialogs.invoices.exportDialog.format.labels.pdf)}</p>
                      <p className={styles["formatDesc"]}>{t((m) => m.dialogs.invoices.exportDialog.format.descriptions.pdf)}</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Options Card */}
          <Card className={styles["optionsCard"]}>
            <CardContent className={styles["cardContent"]}>
              <h3 className={styles["sectionTitle"]}>{t((m) => m.dialogs.invoices.exportDialog.options.title)}</h3>
              <div className={styles["checkboxGroup"]}>
                <div className={styles["radioRow"]}>
                  <Checkbox
                    nativeButton
                    id='include-metadata'
                    checked={exportOptions.includeMetadata}
                    // eslint-disable-next-line react/jsx-no-bind -- inline event handler
                    onCheckedChange={(checked) => handleOptionsChange("includeMetadata", checked === true)}
                  />
                  <Label htmlFor='include-metadata'>{t((m) => m.dialogs.invoices.exportDialog.options.includeMetadata)}</Label>
                </div>
                <div className={styles["radioRow"]}>
                  <Checkbox
                    nativeButton
                    id='include-items'
                    checked={exportOptions.includeProducts}
                    // eslint-disable-next-line react/jsx-no-bind -- inline event handler
                    onCheckedChange={(checked) => handleOptionsChange("includeProducts", checked === true)}
                  />
                  <Label htmlFor='include-items'>{t((m) => m.dialogs.invoices.exportDialog.options.includeProducts)}</Label>
                </div>
                <div className={styles["radioRow"]}>
                  <Checkbox
                    nativeButton
                    id='include-merchant'
                    checked={exportOptions.includeMerchant}
                    // eslint-disable-next-line react/jsx-no-bind -- inline event handler
                    onCheckedChange={(checked) => handleOptionsChange("includeMerchant", checked === true)}
                  />
                  <Label htmlFor='include-merchant'>{t((m) => m.dialogs.invoices.exportDialog.options.includeMerchant)}</Label>
                </div>
              </div>

              {/* Format-specific options */}
              {exportOptions.format === "csv" && (
                <div className={styles["formatOptions"]}>
                  <div className={styles["radioRow"]}>
                    <Checkbox
                      nativeButton
                      id='csv-include-headers'
                      checked={exportOptions.csvOptions?.includeHeaders ?? false}
                      // eslint-disable-next-line react/jsx-no-bind -- inline event handler
                      onCheckedChange={(checked) =>
                        handleOptionsChange("csvOptions", {
                          delimiter: exportOptions.csvOptions?.delimiter ?? ",",
                          includeHeaders: checked === true,
                        })
                      }
                    />
                    <Label htmlFor='csv-include-headers'>{t((m) => m.dialogs.invoices.exportDialog.options.csv.includeHeaders)}</Label>
                  </div>
                  <div className={styles["delimiterGroup"]}>
                    <Label htmlFor='csv-delimiter'>{t((m) => m.dialogs.invoices.exportDialog.options.csv.delimiterLabel)}</Label>
                    <Input
                      className={styles["delimiterInput"]}
                      id='csv-delimiter'
                      placeholder={t((m) => m.dialogs.invoices.exportDialog.options.csv.delimiterPlaceholder)}
                      value={exportOptions.csvOptions?.delimiter ?? ","}
                      // eslint-disable-next-line react/jsx-no-bind -- inline event handler
                      onChange={(e) =>
                        handleOptionsChange("csvOptions", {
                          delimiter: e.target.value,
                          includeHeaders: exportOptions.csvOptions?.includeHeaders ?? true,
                        })
                      }
                    />
                  </div>
                </div>
              )}
              {exportOptions.format === "json" && (
                <div className={styles["formatOptions"]}>
                  <div className={styles["radioRow"]}>
                    <Checkbox
                      nativeButton
                      id='json-pretty-print'
                      checked={exportOptions.jsonOptions?.prettyPrint ?? false}
                      // eslint-disable-next-line react/jsx-no-bind -- inline event handler
                      onCheckedChange={(checked) => handleOptionsChange("jsonOptions", {prettyPrint: checked === true})}
                    />
                    <Label htmlFor='json-pretty-print'>{t((m) => m.dialogs.invoices.exportDialog.options.json.prettyPrint)}</Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* File Size Estimate */}
          <div className={styles["estimate"]}>
            <p className={styles["estimateText"]}>
              {t((m) => m.dialogs.invoices.exportDialog.estimate.label)} <strong>~{estimatedSizeKB} KB</strong>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={close}>
            {t((m) => m.dialogs.invoices.exportDialog.buttons.cancel)}
          </Button>
          {exportOptions.format === "json" && (
            <Button
              variant='outline'
              onClick={handleCopyToClipboard}
              className={styles["copyButton"]}>
              {copied ? (
                <>
                  <TbCheck className={styles["formatIcon"]} />
                  {t((m) => m.dialogs.invoices.exportDialog.buttons.copied)}
                </>
              ) : (
                <>
                  <TbCopy className={styles["formatIcon"]} />
                  {t((m) => m.dialogs.invoices.exportDialog.buttons.copy)}
                </>
              )}
            </Button>
          )}
          <Button
            onClick={handleExport}
            className={styles["exportButton"]}>
            <TbDownload className={styles["formatIcon"]} />
            {t((m) => m.dialogs.invoices.exportDialog.buttons.export)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
