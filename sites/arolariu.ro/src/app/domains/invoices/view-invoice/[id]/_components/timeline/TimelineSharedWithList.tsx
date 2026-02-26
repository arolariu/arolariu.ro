/**
 * @fileoverview Displays list of users the invoice is shared with.
 * @module components/invoice/timeline/shared-with-list
 */

"use client";

import {useDialog} from "@/app/domains/invoices/_contexts/DialogContext";
import {useUserInformation} from "@/hooks";
import {LAST_GUID} from "@/lib/utils.generic";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useMemo} from "react";
import {TbExternalLink, TbGlobe, TbMail, TbUsers} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {getDisplayName, getInitials} from "../../_utils/timeline";
import styles from "./TimelineSharedWithList.module.scss";

/**
 * Renders a list of users the invoice has been shared with.
 * Only visible to the invoice owner.
 *
 * @returns {JSX.Element | null} The shared users list, null if not owner or empty
 *
 * @example
 * ```tsx
 * <TimelineSharedWithList />
 * ```
 */
export function TimelineSharedWithList(): React.JSX.Element | null {
  const t = useTranslations("Domains.services.invoices.ui.timelineSharedWithList");
  const {invoice} = useInvoiceContext();
  const {userInformation} = useUserInformation();
  const {open: openShareDialog} = useDialog("SHARED__INVOICE_SHARE", "share", {invoice});

  // Check if current user is the invoice owner
  const isOwner = userInformation.userIdentifier === invoice.userIdentifier;

  // Check if invoice is publicly shared (contains sentinel GUID)
  const isPublic = useMemo(() => invoice.sharedWith.includes(LAST_GUID), [invoice.sharedWith]);

  // Filter out the sentinel GUID from display
  const sharedUsers = useMemo(() => invoice.sharedWith.filter((id) => id !== LAST_GUID), [invoice.sharedWith]);

  // Only owners can see the sharing list
  if (!isOwner) {
    return null;
  }

  // If no shared users and not public, show nothing
  if (sharedUsers.length === 0 && !isPublic) {
    return null;
  }

  return (
    <div className={styles["container"]}>
      <div className={styles["header"]}>
        <TbUsers className='text-muted-foreground h-4 w-4' />
        <p className={styles["headerLabel"]}>{t("header.title")}</p>
        {Boolean(sharedUsers.length > 0 || isPublic) && (
          <Badge
            variant='secondary'
            className='h-5 px-1.5 text-xs'>
            {isPublic ? t("header.publicBadge") : sharedUsers.length}
          </Badge>
        )}
      </div>

      {/* Public Access Warning */}
      {Boolean(isPublic) && (
        <Alert
          variant='default'
          className='border-orange-500/50 bg-orange-500/10'>
          <TbGlobe className='h-4 w-4 text-orange-500' />
          <AlertTitle className='text-orange-600 dark:text-orange-400'>{t("publicAccess.title")}</AlertTitle>
          <AlertDescription className='text-muted-foreground text-xs'>{t("publicAccess.description")}</AlertDescription>
        </Alert>
      )}

      {/* Shared Users List */}
      {sharedUsers.length > 0 && (
        <div className={styles["usersList"]}>
          {sharedUsers.map((user) => (
            <div
              key={user}
              className={styles["userRow"]}>
              <div className={styles["userInfo"]}>
                <Avatar className='h-7 w-7'>
                  <AvatarFallback className='bg-primary/10 text-primary text-xs'>{getInitials(user)}</AvatarFallback>
                </Avatar>
                <div className={styles["userDetails"]}>
                  <p className={styles["userName"]}>{getDisplayName(user)}</p>
                  <p className={styles["userEmail"]}>{user}</p>
                </div>
              </div>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7 shrink-0'
                      aria-label={t("aria.sendEmail", {user})}>
                      <TbMail className='h-3.5 w-3.5' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side='left'
                    className='text-xs'>
                    {t("actions.sendEmail")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))}
        </div>
      )}

      <Button
        variant='outline'
        size='sm'
        onClick={openShareDialog}
        className='w-full gap-2 bg-transparent'>
        <TbExternalLink className='h-3.5 w-3.5' />
        {t("actions.manageSharing")}
      </Button>
    </div>
  );
}
