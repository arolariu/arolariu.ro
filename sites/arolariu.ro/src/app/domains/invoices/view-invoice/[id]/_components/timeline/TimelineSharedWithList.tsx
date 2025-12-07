/**
 * @fileoverview Displays list of users the invoice is shared with.
 * @module components/invoice/timeline/shared-with-list
 */

"use client";

import {Avatar, AvatarFallback, Badge, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@arolariu/components";
import {TbExternalLink, TbMail, TbUsers} from "react-icons/tb";
import {useInvoiceContext} from "../../_context/InvoiceContext";
import {getDisplayName, getInitials} from "../../_utils/timeline";

/**
 * Renders a list of users the invoice has been shared with.
 *
 * @param {SharedWithListProps} props - Component props
 * @returns {JSX.Element | null} The shared users list or null if empty
 *
 * @example
 * ```tsx
 * <SharedWithList sharedWith={["user@email.com", "family@email.com"]} />
 * ```
 */
export function TimelineSharedWithList(): React.JSX.Element | null {
  const {
    invoice: {sharedWith},
  } = useInvoiceContext();

  if (sharedWith.length === 0) {
    return null;
  }

  return (
    <div className='border-border space-y-3 border-t pt-4'>
      <div className='flex items-center gap-2'>
        <TbUsers className='text-muted-foreground h-4 w-4' />
        <p className='text-muted-foreground text-xs font-semibold tracking-wider uppercase'>Shared With</p>
        <Badge
          variant='secondary'
          className='h-5 px-1.5 text-xs'>
          {sharedWith.length}
        </Badge>
      </div>

      <div className='space-y-2'>
        {sharedWith.map((user, idx) => (
          <div
            key={idx}
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

      <Button
        variant='outline'
        size='sm'
        className='w-full gap-2 bg-transparent'>
        <TbExternalLink className='h-3.5 w-3.5' />
        Manage Sharing
      </Button>
    </div>
  );
}
