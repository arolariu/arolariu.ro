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
import {motion} from "motion/react";
import {TbEdit, TbMenu, TbPlus, TbTrash} from "react-icons/tb";
import {useDialog} from "../../_contexts/DialogContext";

type Props = {
  metadata: Record<string, string>;
};

/**
 * The MetadataTab component displays additional information about the invoice.
 * It shows metadata fields associated with the invoice and allows users to add new fields.
 * @param metadata The metadata associated with the invoice.
 * @returns The MetadataTab component, CSR'ed.
 */
export default function MetadataTab({metadata}: Readonly<Props>) {
  const {open: openAddDialog} = useDialog("metadata", "add");
  const {open: openEditDialog} = useDialog("metadata", "edit", metadata);
  const {open: openDeleteDialog} = useDialog("metadata", "delete", metadata);

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
                  onClick={openAddDialog}
                  size='sm'>
                  <TbPlus className='mr-2 h-4 w-4' />
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
                  className='group hover:border-primary/50 hover:bg-muted/50 relative flex flex-col space-y-1 rounded-md border p-3 transition-colors'>
                  <span className='text-muted-foreground text-sm font-medium'>
                    <Badge
                      variant='outline'
                      className='ml-2 text-xs'>
                      Readonly
                    </Badge>
                  </span>
                  <span>{value}</span>

                  <div className='absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='h-8 w-8'>
                          <TbMenu className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuItem
                          onClick={openEditDialog}
                          disabled>
                          <TbEdit className='mr-2 h-4 w-4' />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={openDeleteDialog}
                          className='text-destructive focus:text-destructive'
                          disabled>
                          <TbTrash className='mr-2 h-4 w-4' />
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
                <TbPlus className='mr-2 h-4 w-4' />
                Add Your First Metadata Field
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
