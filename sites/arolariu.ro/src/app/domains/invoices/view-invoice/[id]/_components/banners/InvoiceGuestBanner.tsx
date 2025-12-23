"use client";

import {Alert, AlertDescription, AlertTitle} from "@arolariu/components";
import {TbInfoCircle} from "react-icons/tb";

export function InvoiceGuestBanner(): React.JSX.Element {
  return (
    <Alert
      variant='default'
      className='mb-6 border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100'>
      <TbInfoCircle className='h-4 w-4 text-blue-600 dark:text-blue-400' />
      <AlertTitle className='text-blue-800 dark:text-blue-300'>Guest View</AlertTitle>
      <AlertDescription className='text-blue-700 dark:text-blue-400'>
        You are not currently the owner of this invoice. The view is limited to what the owner has specified in the share settings.
      </AlertDescription>
    </Alert>
  );
}
