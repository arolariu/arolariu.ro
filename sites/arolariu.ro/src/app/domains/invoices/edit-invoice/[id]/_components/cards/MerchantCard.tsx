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
import {TbArrowRight, TbShoppingBag, TbShoppingCart} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./MerchantCard.module.scss";

type Props = {
  merchant: Merchant;
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
 * **Dialog Integration**: Uses `useDialog` hook to open `INVOICE_MERCHANT` and
 * `INVOICE_MERCHANT_INVOICES` dialogs in "view" mode with merchant as payload.
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
  const {open: openMerchantInfoDialog} = useDialog("EDIT_INVOICE__MERCHANT", "view", merchant);
  const {open: openMerchantReceiptsDialog} = useDialog("EDIT_INVOICE__MERCHANT_INVOICES", "view", merchant);

  return (
    <Card className='group transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <CardTitle>Merchant</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className={styles["merchantInfo"]}>
          <div className={styles["merchantIcon"]}>
            <TbShoppingCart className='text-primary h-5 w-5' />
          </div>
          <div>
            <p className={styles["merchantName"]}>{merchant.name}</p>
            <p className={styles["merchantAddress"]}>Address: {merchant.address.address}</p>
          </div>
        </div>
        <div className={styles["actions"]}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  className='group w-full cursor-pointer'
                  onClick={openMerchantInfoDialog}>
                  <span>View Merchant Details</span>
                  <TbArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>See detailed information about this merchant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  className='group w-full cursor-pointer'
                  onClick={openMerchantReceiptsDialog}>
                  <TbShoppingBag className='mr-2 h-4 w-4' />
                  <span>View All Receipts</span>
                  <TbArrowRight className='ml-2 h-4 w-4 transition-transform group-hover:translate-x-1' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='bottom'>
                <p>View all receipts from this merchant</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
