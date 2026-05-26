"use client";

import {useUserInformation} from "@/hooks";
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
import {useTranslations} from "next-intl-selector";
import Image from "next/image";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {TbArrowRight, TbDeselect, TbGlobe, TbLock, TbLockCog, TbShare2, TbUser} from "react-icons/tb";
import styles from "./SharingCard.module.scss";
import { useDialog } from "../../../_contexts/DialogContext";
import { patchInvoice } from "../../../_actions/invoices";

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
  const t = useTranslations();
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
    toast(t((m) => m.cards.invoices.sharingCard.toasts.removeAccessComingSoon.title), {
      description: t((m) => m.cards.invoices.sharingCard.toasts.removeAccessComingSoon.description),
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
        throw new Error("Failed to update invoice sharing settings");
      }

      // Refresh the page data to reflect the new private state
      router.refresh();
    };

    toast.promise(
      markPrivateAction().finally(() => setIsMarkingPrivate(false)),
      {
        loading: t((m) => m.cards.invoices.sharingCard.toasts.revoke.loading),
        success: t((m) => m.cards.invoices.sharingCard.toasts.revoke.success),
        error: (error: unknown) => t((m) => m.cards.invoices.sharingCard.toasts.revoke.error, {message: error instanceof Error ? error.message : String(error)}),
      },
    );
  }, [invoice.id, invoice.sharedWith, router, t]);

  return (
    <Card className={styles["card"]}>
      <CardHeader>
        <CardTitle>{t((m) => m.cards.invoices.sharingCard.title)}</CardTitle>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <div className={styles["ownerRow"]}>
          <div className={styles["ownerAvatar"]}>
            {userInformation?.user?.imageUrl ? (
              <Image
                src={userInformation?.user?.imageUrl!}
                alt={t((m) => m.cards.invoices.sharingCard.ownerAvatarAlt)}
                width={40}
                height={40}
                className={styles["ownerImage"]}
                priority
              />
            ) : (
              <TbUser className={styles["primaryIcon"]} />
            )}
          </div>
          <div>
            <p className={styles["ownerName"]}>{t((m) => m.cards.invoices.sharingCard.owner)}</p>
            <p className={styles["ownerUsername"]}>{userInformation?.user?.username}</p>
          </div>
          <div className={styles["manageArea"]}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='outline'
                      className={styles["manageButton"]}
                      onClick={handleManageSharing}>
                      <TbLockCog className={styles["buttonIcon"]} />
                      <span>{t((m) => m.cards.invoices.sharingCard.buttons.manageSharing)}</span>
                    </Button>
                  }
                />
                <TooltipContent>
                  <p>{t((m) => m.cards.invoices.sharingCard.tooltips.manageSharing)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Separator />

        {Boolean(isInvoicePublic) && (
          <Alert
            variant='destructive'
            className={styles["publicAlert"]}>
            <TbGlobe className={styles["globeIcon"]} />
            <AlertTitle className={styles["publicAlertTitle"]}>{t((m) => m.cards.invoices.sharingCard.publicInvoice.title)}</AlertTitle>
            <AlertDescription className={styles["publicAlertDescription"]}>{t((m) => m.cards.invoices.sharingCard.publicInvoice.description)}</AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className={styles["sharedTitle"]}>{t((m) => m.cards.invoices.sharingCard.sharedWith)}</h3>
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
                    <TbUser className={styles["sharedUserIcon"]} />
                  </div>
                  <span className={styles["sharedUserName"]}>{t((m) => m.cards.invoices.sharingCard.userWithId, {id: userId})}</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            variant='ghost'
                            className={styles["removeAccessButton"]}
                            onClick={handleRemoveAccess}>
                            <TbDeselect className={styles["icon4"]} />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        <p>{t((m) => m.cards.invoices.sharingCard.tooltips.removeAccess)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className={styles["emptyShared"]}>{isInvoicePublic ? t((m) => m.cards.invoices.sharingCard.emptyShared.public) : t((m) => m.cards.invoices.sharingCard.emptyShared.private)}</p>
          )}
        </div>
      </CardContent>
      <CardFooter className={styles["cardFooter"]}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='outline'
                  className={styles["fullWidthButton"]}
                  onClick={open}>
                  <TbShare2 className={styles["buttonIcon"]} />
                  <span>{t((m) => m.cards.invoices.sharingCard.buttons.shareInvoice)}</span>
                  <TbArrowRight className={styles["arrowIcon"]} />
                </Button>
              }
            />
            <TooltipContent>
              <p>{t((m) => m.cards.invoices.sharingCard.tooltips.shareInvoice)}</p>
            </TooltipContent>
          </Tooltip>

          {Boolean(isInvoicePublic) && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant='destructive'
                    className={styles["fullWidthButton"]}
                    disabled={isMarkingPrivate}
                    onClick={handleMarkPrivate}>
                    <span>{isMarkingPrivate ? t((m) => m.cards.invoices.sharingCard.buttons.revokingAccess) : t((m) => m.cards.invoices.sharingCard.buttons.markAsPrivate)}</span>
                    <TbLock className={styles["arrowIcon"]} />
                  </Button>
                }
              />
              <TooltipContent side='bottom'>
                <p>{t((m) => m.cards.invoices.sharingCard.tooltips.markAsPrivate)}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
