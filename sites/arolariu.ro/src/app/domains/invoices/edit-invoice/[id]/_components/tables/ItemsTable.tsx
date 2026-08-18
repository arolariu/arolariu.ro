"use client";

/**
 * @fileoverview Structured invoice item table.
 * @module domains/invoices/edit-invoice/[id]/components/tables/ItemsTable
 */

import {
  AllergenAssessmentStatusBadge,
  ClassificationProvenance,
} from "@/app/domains/invoices/_components/analysis/StructuredAnalysisDetails";
import type {Invoice} from "@/types/invoices";
import {Button, Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbAlertTriangle, TbEdit} from "react-icons/tb";
import {useDialog, useDialogs} from "../../../../_contexts/DialogContext";
import styles from "./ItemsTable.module.scss";

interface Props {
  /** Invoice containing the public product response DTOs. */
  readonly invoice: Invoice;
}

/** Renders products with canonical classification and assessment outcomes. */
export default function ItemsTable({invoice}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const {open: openItemsDialog} = useDialog("EDIT_INVOICE__ITEMS", "edit", invoice);
  const {openDialog} = useDialogs();

  return (
    <div className={styles["tableContainer"]}>
      <Button
        variant='outline'
        onClick={openItemsDialog}>
        <TbEdit />
        {t((m) => m.dialogs.invoices.itemsDialog.buttons.saveChanges)}
      </Button>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t((m) => m.dialogs.invoices.itemsDialog.table.item)}</TableHead>
            <TableHead>{t((m) => m.dialogs.invoices.itemsDialog.table.classification)}</TableHead>
            <TableHead>{t((m) => m.dialogs.invoices.itemsDialog.table.quantity)}</TableHead>
            <TableHead>{t((m) => m.dialogs.invoices.itemsDialog.table.price)}</TableHead>
            <TableHead>{t((m) => m.dialogs.invoices.itemsDialog.table.actions)}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoice.items.map((item, index) => (
            <TableRow key={`${item.productCode}-${item.name}-${index}`}>
              <TableCell>{item.name}</TableCell>
              <TableCell>
                <ClassificationProvenance
                  classification={item.classification}
                  compact
                />
              </TableCell>
              <TableCell>
                {item.quantity} {item.quantityUnit}
              </TableCell>
              <TableCell>{item.totalPrice}</TableCell>
              <TableCell>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => openDialog("EDIT_INVOICE__ALLERGENS", "view", {invoice, product: item, productIndex: index})}>
                  <TbAlertTriangle />
                  <AllergenAssessmentStatusBadge assessment={item.allergenAssessment} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
