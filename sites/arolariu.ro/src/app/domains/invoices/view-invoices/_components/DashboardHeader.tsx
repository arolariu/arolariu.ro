/** @format */

"use client";

import {Button} from "@arolariu/components";
import {motion} from "framer-motion";
import {useState} from "react";
import {TbDownload, TbPlus, TbUpload} from "react-icons/tb";
import {ImportDialog} from "./dialogs/Import";

export function DashboardHeader() {
  const [importDialogOpen, setImportDialogOpen] = useState<boolean>(false);

  return (
    <>
      <motion.div
        initial={{y: -20, opacity: 0}}
        animate={{y: 0, opacity: 1}}
        transition={{duration: 0.3}}
        className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Invoice Management</h1>
          <p className='text-muted-foreground mt-1'>Manage your receipts and track your spending habits</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            className='gap-1'
            onClick={() => setImportDialogOpen(true)}>
            <TbUpload className='h-4 w-4' />
            <span className='hidden sm:inline'>Import</span>
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='gap-1'>
            <TbDownload className='h-4 w-4' />
            <span className='hidden sm:inline'>Export</span>
          </Button>
          <Button
            size='sm'
            className='gap-1'>
            <TbPlus className='h-4 w-4' />
            <span>New Invoice</span>
          </Button>
        </div>
      </motion.div>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </>
  );
}
