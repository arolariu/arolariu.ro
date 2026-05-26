import type {Merchant} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {TbArrowRight, TbShoppingBag, TbShoppingCart} from "react-icons/tb";
import {useDialogs} from "../../../../_contexts/DialogContext";
import styles from "./MerchantCard.module.scss";

type Props = {
  merchant: Merchant | null;
};

/**
 * Displays merchant information with navigation to detailed views and receipt history.
 *
 * @remarks
 * **Rendering Context**: Client Component (uses `useDialog` hook for dialog navigation).
 *
 * **Merchant Details**:
 * - **Name**: Merchant business name with shopping cart icon
 * - **Address**: Physical location of the merchant
 *
 * **Navigation Actions**:
 * - **View Merchant Details**: Opens `MerchantDialog` with full merchant info
 *   (address, phone, parent company, category)
 * - **View All Receipts**: Opens `MerchantReceiptsDialog` showing all invoices
 *   from this merchant with filtering and sorting
 *
 * **Dialog Integration**: Uses `useDialogs().openDialog` invoked from button
 * `onClick` handlers (after the early-return guard narrows merchant to non-null).
 * This ensures the dialog is never dispatched with a null payload.
 *
 * **Domain Context**: Part of the edit-invoice sidebar, providing quick access
 * to merchant context and cross-invoice navigation.
 *
 * @param props - Component properties containing merchant data
 * @returns Client-rendered card with merchant info and navigation buttons
 *
 * @example
 * ```tsx
 * <MerchantCard merchant={merchant} />
 * // Displays: Merchant name, address, and two action buttons
 * ```
 *
 * @see {@link MerchantDialog} - Detailed merchant information dialog
 * @see {@link MerchantReceiptsDialog} - All receipts from merchant dialog
 * @see {@link Merchant} - Merchant type definition
 */
export default function MerchantCard({merchant}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const {openDialog} = useDialogs();

  /** Opens the merchant details dialog (narrowed non-null by guard). */
  const handleOpenMerchantDialog = useCallback(() => {
    if (merchant) {
      openDialog("EDIT_INVOICE__MERCHANT", "view", merchant);
    }
  }, [merchant, openDialog]);

  /** Opens the merchant receipts dialog (narrowed non-null by guard). */
  const handleOpenMerchantReceiptsDialog = useCallback(() => {
    if (merchant) {
      openDialog("EDIT_INVOICE__MERCHANT_INVOICES", "view", merchant);
    }
  }, [merchant, openDialog]);

  // Early return if merchant is null — guards both trigger buttons from rendering,
  // which guarantees neither dialog can be dispatched with a null payload.
  if (!merchant) {
    return (
      <Card className={styles["card"]}>
        <CardHeader>
          <CardTitle>{t((m) => m["IMS--Cards"].merchantCard.title)}</CardTitle>
        </CardHeader>
        <CardContent className={styles["cardContent"]}>
          <p className={styles["noMerchantText"]}>{t((m) => m["IMS--Cards"].merchantCard.noMerchantLinked)}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={styles["card"]}>
      <CardHeader>
        <CardTitle>{t((m) => m["IMS--Cards"].merchantCard.title)}</CardTitle>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <div className={styles["merchantInfo"]}>
          <div className={styles["merchantIcon"]}>
            <TbShoppingCart className={styles["primaryIcon"]} />
          </div>
          <div>
            <p className={styles["merchantName"]}>{merchant.name}</p>
            <p className={styles["merchantAddress"]}>{t((m) => m["IMS--Cards"].merchantCard.addressLabel, {address: merchant.address.address})}</p>
          </div>
        </div>
        <div className={styles["actions"]}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='outline'
                    className={styles["actionButton"]}
                    // eslint-disable-next-line react/jsx-no-bind -- merchant is narrowed non-null here
                    onClick={handleOpenMerchantDialog}>
                    <span>{t((m) => m["IMS--Cards"].merchantCard.buttons.viewMerchantDetails)}</span>
                    <TbArrowRight className={styles["arrowIcon"]} />
                  </Button>
                }
              />
              <TooltipContent>
                <p>{t((m) => m["IMS--Cards"].merchantCard.tooltips.viewMerchantDetails)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='outline'
                    className={styles["actionButton"]}
                    // eslint-disable-next-line react/jsx-no-bind -- merchant is narrowed non-null here
                    onClick={handleOpenMerchantReceiptsDialog}>
                    <TbShoppingBag className={styles["buttonIcon"]} />
                    <span>{t((m) => m["IMS--Cards"].merchantCard.buttons.viewAllReceipts)}</span>
                    <TbArrowRight className={styles["arrowIcon"]} />
                  </Button>
                }
              />
              <TooltipContent side='bottom'>
                <p>{t((m) => m["IMS--Cards"].merchantCard.tooltips.viewAllReceipts)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
