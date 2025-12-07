import {useUserInformation} from "@/hooks";
import type {Invoice} from "@/types/invoices";
import {
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
import Image from "next/image";
import {useCallback} from "react";
import {TbArrowRight, TbDeselect, TbLock, TbLockCog, TbShare2, TbUser} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";

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
  const {open} = useDialog("INVOICE_SHARE", "edit", invoice);
  const {userInformation} = useUserInformation();

  // Placeholder handlers for features not yet implemented
  const handleManageSharing = useCallback(() => {
    // TODO: Implement manage sharing dialog
    open();
  }, [open]);

  const handleRemoveAccess = useCallback(() => {
    // TODO: Implement remove access functionality for specific user
    toast("Remove access feature coming soon", {
      description: "This feature is currently under development.",
    });
  }, []);

  const handleMarkPrivate = useCallback(() => {
    // TODO: Implement mark as private functionality
    toast("Mark private feature coming soon", {
      description: "This feature is currently under development.",
    });
  }, []);

  return (
    <Card className='group transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <CardTitle>Sharing</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-center'>
          <div className='bg-primary/10 mr-3 flex h-10 w-10 items-center justify-center rounded-full'>
            {userInformation?.user?.imageUrl ? (
              <Image
                src={userInformation.user.imageUrl}
                alt='User'
                width={40}
                height={40}
                className='rounded-full'
                priority
              />
            ) : (
              <TbUser className='text-primary h-5 w-5' />
            )}
          </div>
          <div>
            <p className='font-medium'>Owner</p>
            <p className='text-muted-foreground text-sm'>{userInformation?.user?.username}</p>
          </div>
          <div className='ml-auto flex items-center justify-end'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='outline'
                    className='group ml-auto cursor-pointer'
                    onClick={handleManageSharing}>
                    <TbLockCog className='mr-2 h-4 w-4' />
                    <span>Manage Sharing</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manage sharing settings for this invoice</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className='mb-2 text-sm font-medium'>Shared With</h3>
          {invoice.sharedWith.length > 0 ? (
            <div className='space-y-2'>
              {invoice.sharedWith.map((userId, index) => (
                <motion.div
                  key={userId}
                  className='flex items-center'
                  initial={{opacity: 0, x: -20}}
                  animate={{opacity: 1, x: 0}}
                  transition={{delay: index * 0.1}}
                  whileHover={{x: 5}}>
                  <div className='bg-muted mr-2 flex h-8 w-8 items-center justify-center rounded-full'>
                    <TbUser className='h-4 w-4' />
                  </div>
                  <span className='text-sm'>User {userId}</span>
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
                        <p>Remove access</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className='text-muted-foreground text-sm'>Not shared with anyone</p>
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
                <span>Share Invoice</span>
                <TbArrowRight className='ml-2 h-4 w-4 transition-transform' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Share this invoice with other users</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='destructive'
                className='w-full cursor-pointer'
                onClick={handleMarkPrivate}>
                <span>Mark as Private</span>
                <TbLock className='ml-2 h-4 w-4 transition-transform' />
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom'>
              <p>Mark the invoice as private</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  );
}
