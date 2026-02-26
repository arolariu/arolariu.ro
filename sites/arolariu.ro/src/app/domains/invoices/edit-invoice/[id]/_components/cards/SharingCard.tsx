import {useUserInformation} from "@/hooks";
import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import {LAST_GUID} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Separator,
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {TbArrowRight, TbDeselect, TbGlobe, TbLock, TbLockCog, TbShare2, TbUser} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./SharingCard.module.scss";

type Props = {
  invoice: Invoice;
};

/**
 * Displays invoice sharing status and provides controls for managing shared access.
 *
 * @remarks
 * **Rendering Context**: Client Component (uses hooks for user info and dialog state).
 *
 * **Sharing Information Displayed**:
 * - **Owner**: Current user's profile image and username
 * - **Shared With**: List of users who have access to this invoice
 *
 * **Sharing Actions**:
 * - **Manage Sharing**: Opens `SharingDialog` for configuring access settings
 * - **Share Invoice**: Opens `SharingDialog` for adding new shared users
 * - **Remove Access**: Removes specific user's access (placeholder implementation)
 * - **Mark as Private**: Revokes all shared access (placeholder implementation)
 *
 * **User Context**: Uses `useUserInformation` hook to display owner profile.
 * Falls back to generic user icon if no profile image available.
 *
 * **Animation**: Shared user list items animate in with staggered horizontal
 * slide effect via Framer Motion.
 *
 * **Domain Context**: Part of the edit-invoice sidebar, enabling collaborative
 * invoice management through controlled sharing.
 *
 * @param props - Component properties containing the invoice with sharing data
 * @returns Client-rendered card with sharing status and management controls
 *
 * @example
 * ```tsx
 * <SharingCard invoice={invoice} />
 * // Displays: Owner info, shared users list, sharing action buttons
 * ```
 *
 * @see {@link SharingDialog} - Dialog for managing invoice sharing
 * @see {@link useUserInformation} - Hook for current user context
 * @see {@link Invoice} - Invoice type with sharedWith array
 */
export default function SharingCard({invoice}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.EditInvoice.sharingCard");
  const {open} = useDialog("SHARED__INVOICE_SHARE", "share", {invoice});
  const {userInformation} = useUserInformation();
  const router = useRouter();
  const [isMarkingPrivate, setIsMarkingPrivate] = useState<boolean>(false);

  const isInvoicePublic = invoice.sharedWith?.includes(LAST_GUID) ?? false;
  const sharedUsers = invoice.sharedWith?.filter((id) => id !== LAST_GUID) ?? [];

  // Placeholder handlers for features not yet implemented
  const handleManageSharing = useCallback(() => {
    // TODO: Implement manage sharing dialog
    open();
  }, [open]);

  const handleRemoveAccess = useCallback(() => {
    // TODO: Implement remove access functionality for specific user
    toast(t("toasts.removeAccessComingSoon.title"), {
      description: t("toasts.removeAccessComingSoon.description"),
    });
  }, [t]);

  /**
   * Revokes public access from the invoice by removing LAST_GUID from sharedWith.
   * Uses toast.promise for consistent loading/success/error states.
   * Button is disabled via `isMarkingPrivate` state until backend responds.
   */
  const handleMarkPrivate = useCallback(() => {
    setIsMarkingPrivate(true);

    const markPrivateAction = async () => {
      const newSharedWith = (invoice.sharedWith ?? []).filter((id) => id !== LAST_GUID);

      const result = await patchInvoice({
        invoiceId: invoice.id,
        payload: {sharedWith: newSharedWith},
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Refresh the page data to reflect the new private state
      router.refresh();
    };

    toast.promise(
      markPrivateAction().finally(() => setIsMarkingPrivate(false)),
      {
        loading: t("toasts.revoke.loading"),
        success: t("toasts.revoke.success"),
        error: (err: Error) => t("toasts.revoke.error", {message: err.message}),
      },
    );
  }, [invoice.id, invoice.sharedWith, router, t]);

  return (
    <Card className='group transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className={styles["ownerRow"]}>
          <div className={styles["ownerAvatar"]}>
            {userInformation?.user?.imageUrl ? (
              <Image
                src={userInformation?.user?.imageUrl!}
                alt={t("ownerAvatarAlt")}
                width={40}
                height={40}
                className={styles["ownerImage"]}
                priority
              />
            ) : (
              <TbUser className='text-primary h-5 w-5' />
            )}
          </div>
          <div>
            <p className={styles["ownerName"]}>{t("owner")}</p>
            <p className={styles["ownerUsername"]}>{userInformation?.user?.username}</p>
          </div>
          <div className={styles["manageArea"]}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='outline'
                    className='group ml-auto cursor-pointer'
                    onClick={handleManageSharing}>
                    <TbLockCog className='mr-2 h-4 w-4' />
                    <span>{t("buttons.manageSharing")}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("tooltips.manageSharing")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Separator />

        {Boolean(isInvoicePublic) && (
          <Alert
            variant='destructive'
            className='border-orange-500/50 bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200'>
            <TbGlobe className='size-4 text-orange-600 dark:text-orange-400' />
            <AlertTitle className='text-orange-800 dark:text-orange-300'>{t("publicInvoice.title")}</AlertTitle>
            <AlertDescription className='text-xs text-orange-700 dark:text-orange-400'>{t("publicInvoice.description")}</AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className={styles["sharedTitle"]}>{t("sharedWith")}</h3>
          {sharedUsers.length > 0 ? (
            <div className={styles["sharedList"]}>
              {sharedUsers.map((userId, index) => (
                <motion.div
                  key={userId}
                  className={styles["sharedUserRow"]}
                  initial={{opacity: 0, x: -20}}
                  animate={{opacity: 1, x: 0}}
                  transition={{delay: index * 0.1}}
                  whileHover={{x: 5}}>
                  <div className={styles["sharedUserAvatar"]}>
                    <TbUser className='h-4 w-4' />
                  </div>
                  <span className={styles["sharedUserName"]}>{t("userWithId", {id: userId})}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='ghost'
                          className='ml-auto cursor-pointer'
                          onClick={handleRemoveAccess}>
                          <TbDeselect className='h-4 w-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("tooltips.removeAccess")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className={styles["emptyShared"]}>{isInvoicePublic ? t("emptyShared.public") : t("emptyShared.private")}</p>
          )}
        </div>
      </CardContent>
      <CardFooter className='flex flex-col gap-4'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                className='w-full cursor-pointer'
                onClick={open}>
                <TbShare2 className='mr-2 h-4 w-4' />
                <span>{t("buttons.shareInvoice")}</span>
                <TbArrowRight className='ml-2 h-4 w-4 transition-transform' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("tooltips.shareInvoice")}</p>
            </TooltipContent>
          </Tooltip>

          {Boolean(isInvoicePublic) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='destructive'
                  className='w-full cursor-pointer'
                  disabled={isMarkingPrivate}
                  onClick={handleMarkPrivate}>
                  <span>{isMarkingPrivate ? t("buttons.revokingAccess") : t("buttons.markAsPrivate")}</span>
                  <TbLock className='ml-2 h-4 w-4 transition-transform' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='bottom'>
                <p>{t("tooltips.markAsPrivate")}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
