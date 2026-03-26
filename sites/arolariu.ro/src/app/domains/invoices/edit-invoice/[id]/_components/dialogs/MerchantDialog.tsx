import {type Merchant, MerchantCategory} from "@/types/invoices";
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
import {useTranslations} from "next-intl";
import {TbBuilding, TbBuildingStore, TbMapPin, TbPhone} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
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
 * - **Parent Company**: Corporate parent identifier
 *
 * **Actions**:
 * - **Open in Maps**: Placeholder for map integration (not yet implemented)
 *
 * **Visual Design**:
 * - Profile-style header with merchant icon in primary-tinted circle
 * - Table layout for structured detail presentation
 * - Category badge derived from `MerchantCategory` enum
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
 * @see {@link MerchantCategory} - Category enum for badge display
 */
export default function MerchantDialog(): React.JSX.Element {
  const t = useTranslations("Invoices.EditInvoice.merchantDialog");
  const {
    currentDialog: {payload},
    isOpen,
    open,
    close,
  } = useDialog("EDIT_INVOICE__MERCHANT");

  const merchant = payload as Merchant;

  const merchantCategoryKey = Object.keys(MerchantCategory)[merchant.category];
  const merchantCategoryAsString = MerchantCategory[merchantCategoryKey as keyof typeof MerchantCategory];

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader className={styles["dialogHeader"]}>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", {merchantName: merchant.name})}</DialogDescription>
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
                {merchantCategoryAsString}
              </Badge>
            </div>
          </div>

          <Table>
            <TableBody>
              <TableRow>
                <TableCell className={styles["labelCell"]}>
                  <div className={styles["detailRow"]}>
                    <TbMapPin className={styles["mutedIcon"]} />
                    <span className={styles["detailLabel"]}>{t("fields.address")}</span>
                  </div>
                </TableCell>
                <TableCell className={styles["valueCell"]}>{merchant.address.address}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className={styles["labelCell"]}>
                  <div className={styles["detailRow"]}>
                    <TbPhone className={styles["mutedIcon"]} />
                    <span className={styles["detailLabel"]}>{t("fields.phone")}</span>
                  </div>
                </TableCell>
                <TableCell className={styles["valueCell"]}>{merchant.address.phoneNumber}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className={styles["labelCell"]}>
                  <div className={styles["detailRow"]}>
                    <TbBuildingStore className={styles["mutedIcon"]} />
                    <span className={styles["detailLabel"]}>{t("fields.parentCompany")}</span>
                  </div>
                </TableCell>
                <TableCell className={styles["valueCell"]}>{merchant.parentCompanyId}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className={styles["footer"]}>
          <Button
            type='button'
            className={styles["mapsButton"]}>
            {t("buttons.openInMaps")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
