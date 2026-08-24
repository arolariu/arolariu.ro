"use client";

import {type Merchant} from "@/types/invoices";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbBuilding, TbMapPin, TbPhone} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./MerchantDialog.module.scss";

/**
 * Dialog displaying detailed merchant information for the current invoice.
 *
 * @remarks
 * **Rendering Context**: Client Component (uses `useDialog` hook).
 *
 * **Merchant Details Displayed**:
 * - **Name**: Business name with category badge
 * - **Address**: Physical location with map pin icon
 * - **Phone**: Contact number with phone icon
 *
 * **Actions**:
 * - **Open in Maps**: Placeholder for map integration (not yet implemented)
 *
 * **Visual Design**:
 * - Profile-style header with merchant icon in primary-tinted circle
 * - Table layout for structured detail presentation
 * - Classification badge showing merchant sector
 *
 * **Dialog Integration**: Uses `useDialog` hook with `INVOICE_MERCHANT` type.
 * Payload contains the full `Merchant` object.
 *
 * **Domain Context**: Provides merchant context for invoice editing,
 * helping users verify merchant details and navigate to related data.
 *
 * @returns Client-rendered dialog with merchant details table
 *
 * @example
 * ```tsx
 * // Opened via MerchantCard "View Merchant Details" button:
 * const {open} = useDialog("INVOICE_MERCHANT", "view", merchant);
 * <Button onClick={open}>View Merchant Details</Button>
 * ```
 *
 * @see {@link MerchantCard} - Parent component that opens this dialog
 * @see {@link Merchant} - Merchant type definition
 */
export default function MerchantDialog(): React.JSX.Element {
  const t = useTranslations();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__MERCHANT");

  const merchant = payload;
  const merchantClassification = merchant.classification?.officialLabel ?? "Unclassified";

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- simple dialog close handler
      onOpenChange={(shouldOpen) => {
        if (!shouldOpen) close();
      }}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader className={styles["dialogHeader"]}>
          <DialogTitle>{t((m) => m.dialogs.invoices.merchantDialog.title)}</DialogTitle>
          <DialogDescription>{t((m) => m.dialogs.invoices.merchantDialog.description, {merchantName: merchant.name})}</DialogDescription>
        </DialogHeader>
        <div className={styles["body"]}>
          <div className={styles["merchantProfile"]}>
            <div className={styles["merchantAvatar"]}>
              <TbBuilding className={styles["buildingIcon"]} />
            </div>
            <div>
              <h3 className={styles["merchantName"]}>{merchant.name}</h3>
              <Badge
                variant='outline'
                className={styles["categoryBadge"]}>
                {merchantClassification}
              </Badge>
            </div>
          </div>

          <Table>
            <TableBody>
              <TableRow>
                <TableCell className={styles["labelCell"]}>
                  <div className={styles["detailRow"]}>
                    <TbMapPin className={styles["mutedIcon"]} />
                    <span className={styles["detailLabel"]}>{t((m) => m.dialogs.invoices.merchantDialog.fields.address)}</span>
                  </div>
                </TableCell>
                <TableCell className={styles["valueCell"]}>{merchant.address.address}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className={styles["labelCell"]}>
                  <div className={styles["detailRow"]}>
                    <TbPhone className={styles["mutedIcon"]} />
                    <span className={styles["detailLabel"]}>{t((m) => m.dialogs.invoices.merchantDialog.fields.phone)}</span>
                  </div>
                </TableCell>
                <TableCell className={styles["valueCell"]}>{merchant.address.phoneNumber}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className={styles["footer"]}>
          <Button
            type='button'
            className={styles["mapsButton"]}>
            {t((m) => m.dialogs.invoices.merchantDialog.buttons.openInMaps)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
