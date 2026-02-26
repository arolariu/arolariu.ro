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
  const t = useTranslations("I18nConsolidation.Invoices.MerchantDialog");
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
      <DialogContent className='sm:max-w-md md:max-w-xl'>
        <DialogHeader className='items-start justify-start justify-items-start'>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", {merchantName: merchant.name})}</DialogDescription>
        </DialogHeader>
        <div className={styles["body"]}>
          <div className={styles["merchantProfile"]}>
            <div className={styles["merchantAvatar"]}>
              <TbBuilding className='text-primary h-6 w-6' />
            </div>
            <div>
              <h3 className={styles["merchantName"]}>{merchant.name}</h3>
              <Badge
                variant='outline'
                className='text-muted-foreground'>
                {merchantCategoryAsString}
              </Badge>
            </div>
          </div>

          <Table>
            <TableBody>
              <TableRow>
                <TableCell className='py-2 pl-0'>
                  <div className={styles["detailRow"]}>
                    <TbMapPin className='text-muted-foreground mr-2 h-4 w-4' />
                    <span className={styles["detailLabel"]}>{t("fields.address")}</span>
                  </div>
                </TableCell>
                <TableCell className='py-2'>{merchant.address.address}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className='py-2 pl-0'>
                  <div className={styles["detailRow"]}>
                    <TbPhone className='text-muted-foreground mr-2 h-4 w-4' />
                    <span className={styles["detailLabel"]}>{t("fields.phone")}</span>
                  </div>
                </TableCell>
                <TableCell className='py-2'>{merchant.address.phoneNumber}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className='py-2 pl-0'>
                  <div className={styles["detailRow"]}>
                    <TbBuildingStore className='text-muted-foreground mr-2 h-4 w-4' />
                    <span className={styles["detailLabel"]}>{t("fields.parentCompany")}</span>
                  </div>
                </TableCell>
                <TableCell className='py-2'>{merchant.parentCompanyId}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div className={styles["footer"]}>
          <Button
            type='button'
            className='w-full'>
            {t("buttons.openInMaps")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
