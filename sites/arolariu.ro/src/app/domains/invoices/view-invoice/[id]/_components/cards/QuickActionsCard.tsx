"use client";

import {Button, Card, CardContent, CardHeader, CardTitle} from "@arolariu/components";
import {TbDownload, TbPencil, TbTrash} from "react-icons/tb";

export function QuickActionsCard(): React.JSX.Element {
  return (
    <Card className='transition-shadow duration-300 hover:shadow-md'>
      <CardHeader>
        <CardTitle className='text-lg'>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>
        <Button
          className='w-full justify-start'
          asChild>
          <a href='#'>
            <TbPencil className='mr-2 h-4 w-4' />
            Edit Invoice
          </a>
        </Button>
        <Button
          variant='outline'
          className='w-full justify-start bg-transparent'>
          <TbDownload className='mr-2 h-4 w-4' />
          Download PDF
        </Button>
        <Button
          variant='destructive'
          className='w-full justify-start'>
          <TbTrash className='mr-2 h-4 w-4' />
          Delete Invoice
        </Button>
      </CardContent>
    </Card>
  );
}

