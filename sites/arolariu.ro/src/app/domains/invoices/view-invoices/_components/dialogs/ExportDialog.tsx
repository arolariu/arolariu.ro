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
import {useTranslations} from "next-intl";
import React, {useCallback, useState} from "react";
import {TbDownload, TbFileSpreadsheet, TbFileText, TbJson} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import type {InvoiceExportFormat, InvoiceExportRequest} from "../../_types/InvoiceExport";
import {exportInvoices} from "../../_utils/export";
import styles from "./ExportDialog.module.scss";

/**
 * The ExportDialog component allows users to export selected invoices in various formats.
 * It includes options to include metadata and line items in the export.
 * @returns The ExportDialog component, CSR'ed.
 */
export default function ExportDialog(): React.JSX.Element {
  const t = useTranslations("Invoices.ViewInvoices.exportDialog");
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

  const handleOptionsChange = useCallback(<K extends keyof InvoiceExportRequest>(key: K, value: InvoiceExportRequest[K]) => {
    setExportOptions((prev) => ({...prev, [key]: value}));
  }, []);

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", {count: String(invoicesToExport.length)})}</DialogDescription>
        </DialogHeader>

        <div className={styles["body"]}>
          <div className={styles["section"]}>
            <h3 className={styles["sectionTitle"]}>{t("format.title")}</h3>
            <RadioGroup
              defaultValue={exportOptions.format}
              // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
              onValueChange={(format) => handleOptionsChange("format", format as InvoiceExportFormat)}>
              <div className={styles["radioRow"]}>
                <RadioGroupItem
                  value='csv'
                  id='csv'
                />
                <Label
                  htmlFor='csv'
                  className={styles["formatLabel"]}>
                  <TbFileSpreadsheet className={styles["formatIcon"]} />
                  {t("format.labels.csv")}
                </Label>
              </div>
              <div className={styles["radioRow"]}>
                <RadioGroupItem
                  value='json'
                  id='json'
                />
                <Label
                  htmlFor='json'
                  className={styles["formatLabel"]}>
                  <TbJson className={styles["formatIcon"]} />
                  {t("format.labels.json")}
                </Label>
              </div>
              <div className={styles["radioRow"]}>
                <RadioGroupItem
                  value='pdf'
                  id='pdf'
                />
                <Label
                  htmlFor='pdf'
                  className={styles["formatLabel"]}>
                  <TbFileText className={styles["formatIcon"]} />
                  {t("format.labels.pdf")}
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className={styles["section"]}>
            <h3 className={styles["sectionTitle"]}>{t("options.title")}</h3>
            <div className={styles["radioRow"]}>
              <Checkbox
                id='include-metadata'
                checked={exportOptions.includeMetadata}
                // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                onCheckedChange={(checked) => handleOptionsChange("includeMetadata", checked === true)}
              />
              <Label htmlFor='include-metadata'>{t("options.includeMetadata")}</Label>
            </div>
            <div className={styles["radioRow"]}>
              <Checkbox
                id='include-items'
                checked={exportOptions.includeProducts}
                // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                onCheckedChange={(checked) => handleOptionsChange("includeProducts", checked === true)}
              />
              <Label htmlFor='include-items'>{t("options.includeProducts")}</Label>
            </div>
            <div className={styles["radioRow"]}>
              <Checkbox
                id='include-merchant'
                checked={exportOptions.includeMerchant}
                // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                onCheckedChange={(checked) => handleOptionsChange("includeMerchant", checked === true)}
              />
              <Label htmlFor='include-merchant'>{t("options.includeMerchant")}</Label>
            </div>
            {exportOptions.format === "csv" && (
              <>
                <div className={styles["radioRow"]}>
                  <Checkbox
                    id='csv-include-headers'
                    checked={exportOptions.csvOptions?.includeHeaders ?? false}
                    // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                    onCheckedChange={(checked) =>
                      handleOptionsChange("csvOptions", {
                        delimiter: exportOptions.csvOptions?.delimiter ?? ",",
                        includeHeaders: checked === true,
                      })
                    }
                  />
                  <Label htmlFor='csv-include-headers'>{t("options.csv.includeHeaders")}</Label>
                </div>
                <Label htmlFor='csv-delimiter'>{t("options.csv.delimiterLabel")}</Label>
                <Input
                  className={styles["delimiterInput"]}
                  id='csv-delimiter'
                  placeholder={t("options.csv.delimiterPlaceholder")}
                  value={exportOptions.csvOptions?.delimiter ?? ","}
                  // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                  onChange={(e) =>
                    handleOptionsChange("csvOptions", {
                      delimiter: e.target.value,
                      includeHeaders: exportOptions.csvOptions?.includeHeaders ?? true,
                    })
                  }
                />
              </>
            )}
            {exportOptions.format === "json" && (
              <div className={styles["radioRow"]}>
                <Checkbox
                  id='json-pretty-print'
                  checked={exportOptions.jsonOptions?.prettyPrint ?? false}
                  // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
                  onCheckedChange={(checked) => handleOptionsChange("jsonOptions", {prettyPrint: checked === true})}
                />
                <Label htmlFor='json-pretty-print'>{t("options.json.prettyPrint")}</Label>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={close}>
            {t("buttons.cancel")}
          </Button>
          <Button
            onClick={handleExport}
            className={styles["exportButton"]}>
            <TbDownload className={styles["formatIcon"]} />
            {t("buttons.export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
