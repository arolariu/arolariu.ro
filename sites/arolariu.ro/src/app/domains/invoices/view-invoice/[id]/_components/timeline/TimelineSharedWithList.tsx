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
import {useMemo} from "react";
import {TbExternalLink, TbGlobe, TbMail, TbUsers} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {getDisplayName, getInitials} from "../../_utils/timeline";

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
    <div className='border-border space-y-3 border-t pt-4'>
      <div className='flex items-center gap-2'>
        <TbUsers className='text-muted-foreground h-4 w-4' />
        <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>Shared With</p>
        {Boolean(sharedUsers.length > 0 || isPublic) && (
          <Badge
            variant='secondary'
            className='h-5 px-1.5 text-xs'>
            {isPublic ? "Public" : sharedUsers.length}
          </Badge>
        )}
      </div>

      {/* Public Access Warning */}
      {Boolean(isPublic) && (
        <Alert
          variant='default'
          className='border-orange-500/50 bg-orange-500/10'>
          <TbGlobe className='h-4 w-4 text-orange-500' />
          <AlertTitle className='text-orange-600 dark:text-orange-400'>Public Access Enabled</AlertTitle>
          <AlertDescription className='text-muted-foreground text-xs'>
            This invoice is publicly accessible. Anyone with the link can view it, including guests without an account.
          </AlertDescription>
        </Alert>
      )}

      {/* Shared Users List */}
      {Boolean(sharedUsers.length > 0) && (
        <div className='space-y-2'>
          {sharedUsers.map((user) => (
            <div
              key={user}
              className='bg-muted/50 hover:bg-muted flex items-center justify-between gap-2 rounded-md p-2 transition-colors'>
              <div className='flex min-w-0 items-center gap-2'>
                <Avatar className='h-7 w-7'>
                  <AvatarFallback className='bg-primary/10 text-primary text-xs'>{getInitials(user)}</AvatarFallback>
                </Avatar>
                <div className='min-w-0'>
                  <p className='truncate text-sm font-medium'>{getDisplayName(user)}</p>
                  <p className='text-muted-foreground truncate text-xs'>{user}</p>
                </div>
              </div>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7 shrink-0'
                      aria-label={`Send email to ${user}`}>
                      <TbMail className='h-3.5 w-3.5' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side='left'
                    className='text-xs'>
                    Send email
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
        Manage Sharing
      </Button>
    </div>
  );
}
