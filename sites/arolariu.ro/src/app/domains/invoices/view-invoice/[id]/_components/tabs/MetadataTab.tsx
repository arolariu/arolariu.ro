/** @format */

"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "framer-motion";
import {Edit, MoreHorizontal, Plus, Trash} from "lucide-react";

type Props = {
  metadata: Record<string, string>;
};

export function MetadataTab({metadata}: Readonly<Props>) {
  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -10}}
      transition={{duration: 0.2}}>
      <Card className='group transition-shadow duration-300 hover:shadow-md'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <div>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Metadata associated with this invoice</CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {}}
                  size='sm'>
                  <Plus className='mr-2 h-4 w-4' />
                  Add Field
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add custom metadata to this invoice</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardHeader>
        <CardContent>
          {Object.keys(metadata).length > 0 ? (
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              {Object.entries(metadata).map(([key, value], index) => (
                <motion.div
                  key={key}
                  initial={{opacity: 0, scale: 0.9}}
                  animate={{opacity: 1, scale: 1}}
                  transition={{delay: index * 0.05}}
                  whileHover={{scale: 1.02}}
                  className='hover:bg-muted/50 group relative flex flex-col space-y-1 rounded-md border p-3 transition-colors hover:border-primary/50'>
                  <span className='text-muted-foreground text-sm font-medium'>
                    <Badge
                      variant='outline'
                      className='ml-2 text-xs'>
                      Readonly
                    </Badge>
                  </span>
                  <span>{value}</span>

                  <div className='absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'>
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onClick={() => {}}
                          disabled={true}>
                          <Edit className='mr-2 h-4 w-4' />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {}}
                          className='text-destructive focus:text-destructive'
                          disabled={true}>
                          <Trash className='mr-2 h-4 w-4' />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className='py-8 text-center'>
              <p className='text-muted-foreground mb-4'>No metadata fields added yet</p>
              <Button
                onClick={() => {}}
                variant='outline'>
                <Plus className='mr-2 h-4 w-4' />
                Add Your First Metadata Field
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
